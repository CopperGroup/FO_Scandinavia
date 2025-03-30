self.onmessage = async (event) => {
    const { jsxString, imports } = event.data;
  
    try {
      const response = await fetch("/api/compile-jsx", {
        method: "POST",
        body: JSON.stringify({ jsxString, imports }),
      });
  
      const { compiledCode } = await response.json();
      self.postMessage({ compiledCode });
    } catch (error) {
      self.postMessage({ error: "Compilation failed" });
    }
  };
  