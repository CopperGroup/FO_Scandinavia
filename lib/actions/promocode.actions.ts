"use server"

import User from "../models/user.model";

export async function generatePromoCode({
  email,
  validityDate = "00001111",
  reusabilityTimes,
  discountPercentage,
}: {
  email: string;
  validityDate?: string;
  reusabilityTimes: number;
  discountPercentage: number;
}) {
  if (discountPercentage < 1 || discountPercentage > 99) {
    throw new Error("Discount percentage must be between 1 and 99.");
  }

  const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 random numbers
  const emailPrefix = email.slice(0, 3).toUpperCase(); // first 3 letters of email
  const cleanedDate = validityDate.replace(/:/g, ""); // remove colons if present
  const promoCode = `DV-${discountPercentage}${randomNumbers}${emailPrefix}${cleanedDate}${reusabilityTimes}`;
  return promoCode;
}



export async function validatePromoCode({
  promoCode,
  email,
}: {
  promoCode: string;
  email: string;
}) {

  const user = await User.findOne({ email })

  if(!user.discounts.includes(promoCode)) {
    return "UNVALID"
  }

  const namePrefix = email.slice(0, 3).toUpperCase();

  const promoParts = promoCode.split("-");
  if (promoParts.length < 2) return "UNVALID";

  const body = promoParts[1]; // Example: "152134TES202512315"
  const discount = body.slice(0, body.length - (4 + 3 + 8 + 1)); // dynamic discount length
  const randomNumbers = body.slice(discount.length, discount.length + 4);
  const codeName = body.slice(discount.length + 4, discount.length + 7);
  const dateAndTimes = body.slice(discount.length + 7);

  const dateStr = dateAndTimes.slice(0, 8); // "20251231"
  const timesStr = dateAndTimes.slice(8);   // "5"

  if (codeName !== namePrefix) return "UNVALID";

  const kyivTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));

  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(4, 6));
  const day = Number(dateStr.slice(6, 8));
  const promoDate = new Date(year, month - 1, day);

  if (kyivTime > promoDate) {
    return "UNVALID";
  }

  let usesLeft = parseInt(timesStr);
  if (isNaN(usesLeft) || usesLeft <= 0) {
    return "UNVALID";
  }

  usesLeft -= 1;

  const updatedPromoCode = `DV-${discount}${randomNumbers}${codeName}${dateStr}${usesLeft}`;

  return updatedPromoCode;
}

  
