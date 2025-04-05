"use server";

import { revalidateTag } from "next/cache";
import Page, { PageType } from "../models/page.model";

export async function fetchPageDataByName({ name }: { name: string }): Promise<PageType>;
export async function fetchPageDataByName({ name }: { name: string }, type: 'json'): Promise<string>;

export async function fetchPageDataByName({ name }: { name: string }, type?: 'json') {
   try {

    const page = await Page.findOne({ name })

    if(type === 'json'){
      return JSON.stringify(page)
    } else {
      return page
    }
   } catch (error: any) {
     throw new Error(`Error fetching page data by name: ${error.message}`)
   }
}

export async function updatePageData({ name, dataInputs }: { name: string, dataInputs: { name: string, value: string }[] }) {
  try {
    await Page.findOneAndUpdate(
        { name },
        { dataInputs: dataInputs },
    )

    revalidateTag(`${name}-page`)
  } catch (error: any) {
    throw new Error(`Erorr updating page data: ${error.message}`)
  }
}