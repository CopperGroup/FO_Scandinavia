import * as babelParser from '@babel/parser';
import * as babelTypes from '@babel/types';
import generate, { GeneratorOptions } from '@babel/generator'; // Import GeneratorOptions if needed

// --- Type Definitions ---

interface StyleObject {
    [key: string]: string | number;
}

interface ComponentInfo {
    isComponent: boolean;
    packageName: string;
    importName: string;
    importType: 'default' | 'named' | 'unknown';
    specificTag?: string;
}

interface ComponentConfig {
    [tagName: string]: ComponentInfo;
}

interface MapExpressionNode {
    type: 'map';
    arraySource: string;
    callbackSource: string;
    parent: string | null;
    // Optional: Add if simulation failed after attempting
    simulationFailed?: boolean;
}

interface JSXObject {
    id: string;
    type: string;
    parent: string | null;
    className?: string;
    style?: StyleObject;
    attributes?: Record<string, string>;
    componentInfo?: ComponentInfo;
    textContent?: string;
    // Children can be elements or map structures (if simulation fails/not applicable)
    children?: (JSXObject | MapExpressionNode)[];
    // Optional key from map simulation
    key?: string | number | null;
}

interface ParsedComponentResult {
    functionBody: string;
    jsxObject: JSXObject | null;
}

// Internal representation for simpler passing during recursion
type IntermediateTextNode = { type: 'text', content: string };
type IntermediateExpressionNode = { type: 'expression', content: string };
type TransformedNode = JSXObject | IntermediateTextNode | IntermediateExpressionNode | MapExpressionNode | null;

interface IdCounter {
    count: number;
}

// Type for the map holding extracted literal array data
type LocalArrayData = Map<string, any[]>;

// --- Main Function ---

export function parseComponentCode(
    componentCodeString: string,
    userComponentConfig: ComponentConfig | null = null
): ParsedComponentResult | null {

    const finalComponentConfig: ComponentConfig = {
        Image: { isComponent: true, packageName: "next/image", importName: "Image", importType: "default", },
        Link: { isComponent: true, packageName: "next/link", importName: "Link", importType: "default", },
        motion: { isComponent: true, packageName: "framer-motion", importName: "motion", importType: "default" },
        ...(userComponentConfig || {})
    };

    // --- Internal Helper: Interpret Literal AST Nodes ---
    // Safely converts simple literal AST nodes (string, number, boolean, null, array, object) to JS values
    function interpretLiteralNode(node: babelTypes.Node | null | undefined): any {
        if (!node) return undefined;
        if (babelTypes.isStringLiteral(node) || babelTypes.isNumericLiteral(node) || babelTypes.isBooleanLiteral(node)) {
            return node.value;
        }
        if (babelTypes.isNullLiteral(node)) {
            return null;
        }
        if (babelTypes.isIdentifier(node) && node.name === 'undefined') {
             return undefined;
        }
        if (babelTypes.isArrayExpression(node)) {
            return node.elements.map(el => interpretLiteralNode(el));
        }
        if (babelTypes.isObjectExpression(node)) {
            const obj: Record<string, any> = {};
            for (const prop of node.properties) {
                if (babelTypes.isObjectProperty(prop)) {
                     // Use literal value for key if computed=false and key is identifier/literal
                    let key: string | undefined;
                    if (!prop.computed) {
                        if (babelTypes.isIdentifier(prop.key)) key = prop.key.name;
                        else if (babelTypes.isStringLiteral(prop.key)) key = prop.key.value;
                    }
                     // If key is found, interpret the value
                    if (key !== undefined) {
                         obj[key] = interpretLiteralNode(prop.value);
                    } else {
                         // Cannot interpret computed keys or complex key types statically
                         console.warn("Cannot interpret complex object key during literal extraction:", prop.key.type);
                    }
                }
                 // Ignore spread elements etc. in literal interpretation
            }
            return obj;
        }
        // Cannot interpret other node types as simple literals
        return undefined;
    }

    // --- Internal Helper: Extract 'const' Array Literals ---
    function extractConstArrayLiterals(nodes: babelTypes.Statement[]): LocalArrayData {
        const data: LocalArrayData = new Map();
        nodes.forEach(node => {
            if (babelTypes.isVariableDeclaration(node) && node.kind === 'const') {
                node.declarations.forEach(declarator => {
                    if (babelTypes.isIdentifier(declarator.id) && babelTypes.isArrayExpression(declarator.init)) {
                        const arrayName = declarator.id.name;
                        const arrayValue = interpretLiteralNode(declarator.init);
                         // Only store if interpretation was successful (didn't return undefined)
                        if (arrayValue !== undefined) {
                            data.set(arrayName, arrayValue);
                        }
                    }
                });
            }
        });
        return data;
    }

    // --- Internal Helper: Transform Style Object --- (same as before)
     function transformStyleObject(/*... */): StyleObject {
         // ... implementation ...
        const style: StyleObject = {};
        if (!arguments[0]) return style;
        const objectExpressionNode = arguments[0] as babelTypes.ObjectExpression;
        objectExpressionNode.properties.forEach(prop => {
            if (babelTypes.isObjectProperty(prop) && babelTypes.isIdentifier(prop.key)) {
                const key = prop.key.name;
                if (babelTypes.isStringLiteral(prop.value) || babelTypes.isNumericLiteral(prop.value)) {
                    style[key] = prop.value.value;
                }
            }
        });
        return style;
    }

    // --- Internal Helper: Generate Source Code --- (same as before)
     function generateSource(node: babelTypes.Node | null | undefined): string {
         // ... implementation ...
         if (!node) return '';
         try {
             const options: GeneratorOptions = { concise: true }; // Use GeneratorOptions type
             return generate(node, options).code.replace(/;$/, '');
         } catch(genError) {
              console.warn("Babel Generator failed for node:", node, genError);
              return '{...GENERATION_ERROR...}';
         }
    }


    // --- Internal Helper: Recursive Node Transformation ---
    function transformNode(
        node: babelTypes.Node | null | undefined,
        parentId: string | null,
        idCounter: IdCounter,
        localArrayData: LocalArrayData, // Pass extracted data
        currentItemData: Record<string, any> | null // Data for current item in simulated map
    ): TransformedNode | JSXObject[] { // Can return array directly from simulated map
        if (!node) return null;

        let currentId: string = '';

        // 1. Handle Text Nodes -> intermediate representation
        if (babelTypes.isJSXText(node)) {
            const text = node.value.trim().replace(/\s+/g, ' ');
            return text ? { type: 'text', content: text } : null;
        }

        // 2. Handle Expressions
        if (babelTypes.isJSXExpressionContainer(node)) {
            const exp = node.expression;

            // 2a. Try substituting from currentItemData if applicable
            if (currentItemData && babelTypes.isMemberExpression(exp) && !exp.computed) {
                 if (babelTypes.isIdentifier(exp.object) /* && exp.object.name === mapItemParamName - need param name */ && babelTypes.isIdentifier(exp.property)) {
                      // Basic check: If object name matches expected map item param (needs context)
                      // For now, let's assume simple cases or pass param name down
                      // Accessing potentially nested data - keep it simple for now
                      const value = currentItemData[exp.property.name];
                       if (value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
                            return { type: 'text', content: String(value) };
                       }
                 }
                 // Add more complex checks like item.data.value if needed here
            }


            // 2b. Handle Simple Literals -> intermediate text
            if (babelTypes.isStringLiteral(exp) || babelTypes.isNumericLiteral(exp)) {
                return { type: 'text', content: String(exp.value) };
            }

            // 2c. Handle .map() calls (attempt simulation or return MapExpressionNode)
            if (babelTypes.isCallExpression(exp) &&
                babelTypes.isMemberExpression(exp.callee) &&
                babelTypes.isIdentifier(exp.callee.property, { name: 'map' }) &&
                exp.arguments.length > 0 &&
                babelTypes.isIdentifier(exp.callee.object) // Check if mapping a simple variable
               )
            {
                const arrayVariableName = exp.callee.object.name;
                const callbackNode = exp.arguments[0];

                 // --- Attempt Map Simulation ---
                 // Check if we have literal data for this variable AND callback is simple
                 if (localArrayData.has(arrayVariableName) &&
                     (babelTypes.isArrowFunctionExpression(callbackNode) || babelTypes.isFunctionExpression(callbackNode)) &&
                     callbackNode.params.length > 0 && // Assuming at least item param
                     babelTypes.isIdentifier(callbackNode.params[0]) // Assuming first param is the item identifier
                    )
                 {
                     const arrayData = localArrayData.get(arrayVariableName)!;
                     const itemParamName = callbackNode.params[0].name;
                     const callbackBody = callbackNode.body; // This is the JSX node (or block)

                     // Check if body directly returns JSX
                      if (babelTypes.isJSXElement(callbackBody) || babelTypes.isJSXFragment(callbackBody) ) {
                           const simulatedChildren: JSXObject[] = [];
                           let simulationOk = true;

                           for (const item of arrayData) {
                                // Simulate: Recursively transform the callback body's JSX
                                // Pass item data as currentItemData
                                const mapItemResult = transformNode(
                                     callbackBody, // Transform the returned JSX structure
                                     parentId, // Parent is the node containing the map
                                     idCounter,
                                     localArrayData, // Pass down local data context
                                     item // Pass current item data for substitution
                                );

                                // Check result - expecting a single JSXObject usually
                                 if (mapItemResult && !Array.isArray(mapItemResult) && 'id' in mapItemResult) {
                                      // Attempt to find and add a 'key' prop if callback used index param etc.
                                      // For simplicity, we are not deeply analyzing the 'key' prop here.
                                     simulatedChildren.push(mapItemResult);
                                 } else {
                                     console.warn(`Map simulation failed for item, callback body didn't yield single JSXObject:`, item);
                                     simulationOk = false;
                                     break; // Stop simulation if one item fails
                                 }
                           }

                           if (simulationOk) {
                               // !! Important: Return the array of simulated children directly !!
                                return simulatedChildren;
                           }
                     }
                 }

                 // --- Fallback: Return MapExpressionNode ---
                 // If simulation wasn't possible or failed
                 return {
                     type: 'map',
                     arraySource: generateSource(exp.callee.object),
                     callbackSource: generateSource(callbackNode),
                     parent: parentId,
                     simulationFailed: true // Mark that simulation was attempted/failed or not possible
                 };
            }

            // 2d. Other complex expressions -> generate source code
            const generatedCode = generateSource(exp);
            return { type: 'expression', content: generatedCode };
        }

        // 3. Handle Element Nodes
        if (babelTypes.isJSXElement(node)) {
             // ... (ID generation, Tag Name - same as before) ...
             const openingElement = node.openingElement;
             let tagName: string = "unknown";
             if (babelTypes.isJSXIdentifier(openingElement.name)) { tagName = openingElement.name.name; }
             else if (babelTypes.isJSXMemberExpression(openingElement.name)) { /* ... member expr check ... */
                   if (babelTypes.isJSXIdentifier(openingElement.name.object) && babelTypes.isJSXIdentifier(openingElement.name.property)) {
                       tagName = `${openingElement.name.object.name}.${openingElement.name.property.name}`;
                   }
             }
             const elementObject: JSXObject = { id: '', type: tagName, parent: parentId, };
             const idAttr = openingElement.attributes.find(attr => babelTypes.isJSXAttribute(attr) && attr.name.name === 'id') as babelTypes.JSXAttribute | undefined;
             if (idAttr && babelTypes.isStringLiteral(idAttr.value) && idAttr.value.value) { currentId = idAttr.value.value; }
             else { currentId = `${tagName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${idCounter.count++}`; }
             elementObject.id = currentId;


             // 3a. Process Attributes (with potential substitution)
             let attributesMap: Record<string, string> | undefined = undefined;
             openingElement.attributes.forEach((attr) => {
                 if (babelTypes.isJSXAttribute(attr)) {
                     const attrName = attr.name.name as string;
                     if (attrName === 'id') return;
                     const valueNode = attr.value;
                     let finalAttrValueString: string = 'true'; // Default for boolean

                     if (valueNode) {
                         if (babelTypes.isStringLiteral(valueNode)) { finalAttrValueString = valueNode.value; }
                         else if (babelTypes.isJSXExpressionContainer(valueNode)) {
                             const exp = valueNode.expression;
                             let substituted = false;

                              // Try substitution from currentItemData first
                             if (currentItemData && babelTypes.isMemberExpression(exp) && !exp.computed) {
                                  if (babelTypes.isIdentifier(exp.object) && babelTypes.isIdentifier(exp.property)) {
                                       // Basic check - requires map item param name context
                                       const value = currentItemData[exp.property.name];
                                        if (value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
                                             finalAttrValueString = String(value);
                                             substituted = true;
                                        }
                                  }
                             }

                             // If not substituted, handle literals or generate source
                             if (!substituted) {
                                 if (babelTypes.isStringLiteral(exp) || babelTypes.isNumericLiteral(exp) || babelTypes.isBooleanLiteral(exp)) { finalAttrValueString = String(exp.value); }
                                 else if (babelTypes.isObjectExpression(exp) && attrName === 'style') { elementObject.style = transformStyleObject(exp); return; }
                                 else { finalAttrValueString = generateSource(exp); } // Generate code
                             }
                         }
                     }

                     if (attrName === 'className') { elementObject.className = finalAttrValueString; }
                     else if (attrName !== 'style') {
                         if (!attributesMap) attributesMap = {};
                         attributesMap[attrName] = finalAttrValueString;
                     }
                 }
             });
             if (attributesMap && Object.keys(attributesMap).length > 0) { elementObject.attributes = attributesMap; }

             // 3b. Component Info (Updated Default Logic)
              const componentInfoFromConfig = finalComponentConfig[tagName];
              const isMotion = tagName.startsWith('motion.');
              const isNextSpecific = tagName === 'Image' || tagName === 'Link';
              const isLikelyUserComponent = tagName[0] === tagName[0].toUpperCase() && !isMotion && !isNextSpecific;

               if (componentInfoFromConfig) {
                   elementObject.componentInfo = { ...componentInfoFromConfig };
               } else if (isMotion && finalComponentConfig['motion']) { // Handle motion.* specifically if 'motion' is configured
                   elementObject.componentInfo = { ...(finalComponentConfig['motion']), isComponent: true, specificTag: tagName };
               } else if (isLikelyUserComponent) {
                   // Default to /components/ui if not Image/Link/motion.* and not in user config
                   elementObject.componentInfo = {
                       isComponent: true,
                       packageName: "@/components/ui", // Default path
                       importName: tagName,
                       importType: "named" // Assume named import for UI components
                   };
               }


             // 3c. Process Children: Consolidate text, collect elements/maps, handle simulated map results
             let aggregatedText = '';
             const elementChildren: (JSXObject | MapExpressionNode)[] = [];

             node.children.forEach((child) => {
                 // Pass currentItemData down if it exists, otherwise null
                 const transformedChild = transformNode(child, elementObject.id, idCounter, localArrayData, currentItemData);

                 if (transformedChild) {
                      // --- Handle results ---
                      // If result is an array (from successful map simulation)
                      if (Array.isArray(transformedChild)) {
                           elementChildren.push(...transformedChild); // Spread the simulated children
                      }
                      // If intermediate text/expression
                      else if ('type' in transformedChild && (transformedChild.type === 'text' || transformedChild.type === 'expression')) {
                           aggregatedText += (aggregatedText ? ' ' : '') + transformedChild.content;
                      }
                      // If map structure (simulation failed/skipped)
                      else if ('type' in transformedChild && transformedChild.type === 'map') {
                           elementChildren.push(transformedChild);
                      }
                      // If regular JSXObject
                      else if ('id' in transformedChild) {
                           elementChildren.push(transformedChild);
                      }
                 }
             });

             if (aggregatedText) { elementObject.textContent = aggregatedText.trim(); }
             if (elementChildren.length > 0) { elementObject.children = elementChildren; }

             return elementObject;
        }

        return null; // Ignore other node types
    }

    // --- Main Function Execution ---

    if (!componentCodeString || typeof componentCodeString !== 'string') { /*... error handling ...*/ return null; }
    const trimmedCode = componentCodeString.trim();
    if (!trimmedCode) { /*... error handling ...*/ return null; }

    try {
        const ast = babelParser.parse(trimmedCode, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true, });

        let returnStatement: babelTypes.ReturnStatement | null = null;
        let returnStatementIndex: number = -1;
        ast.program.body.forEach((node, index) => { if (babelTypes.isReturnStatement(node) && returnStatementIndex === -1) { returnStatement = node; returnStatementIndex = index; } });

        if (returnStatementIndex === -1) { /*... error handling: no return ...*/ return null; }

        const functionBodyNodes = ast.program.body.slice(0, returnStatementIndex);

        // --- Extract local const array data ---
        const localArrayData = extractConstArrayLiterals(functionBodyNodes);

        // Generate function body string
        const bodyProgram = babelTypes.program(functionBodyNodes);
        const functionBody = generateSource(bodyProgram);

        // Transform JSX
        const jsxRootNode = returnStatement?.argument;
        let rootElementNode: babelTypes.JSXElement | null = null;
        if (babelTypes.isJSXElement(jsxRootNode)) { rootElementNode = jsxRootNode; }
        else if (babelTypes.isJSXFragment(jsxRootNode)) { rootElementNode = jsxRootNode.children.find((child): child is babelTypes.JSXElement => babelTypes.isJSXElement(child)) ?? null; }

        let jsxObjectResult: JSXObject | null = null;
        if (rootElementNode) {
            const idCounter: IdCounter = { count: 0 };
             // Start transformation, passing local data map, initial currentItem is null
            const transformedResult = transformNode(rootElementNode, null, idCounter, localArrayData, null);
            if (transformedResult && !Array.isArray(transformedResult) && 'id' in transformedResult) {
                jsxObjectResult = transformedResult;
            } else if (transformedResult) { /* ... warning non-element root ... */ }
        } else { /* ... warning no valid JSX root ... */ }

        return { functionBody, jsxObject: jsxObjectResult };

    } catch (error: unknown) { /*... error handling ...*/ return null; }
}