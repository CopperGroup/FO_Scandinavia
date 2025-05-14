"use server";

import User from "../models/user.model"
import { connectToDB } from "@/lib/mongoose"
import clearCache from "./cache";
import { UserType } from "../types/types";
import { generateLongPassword } from "../utils";
import { redirect } from "next/navigation";
import { hasPermission } from "../roles";
import bcrypt from "bcryptjs";
import { generatePromoCode } from "./promocode.actions";

type CreateUserParams = {
    username: string, 
    email: string,
    password: string,
    phoneNumber: string,
    promoCode: string
}

export async function createUser({ username, email, password, phoneNumber, promoCode }: CreateUserParams) {
    try {
        const newUser = await User.create({
            username,
            email,
            password,
            phoneNumber,
            discounts: [promoCode],
            selfCreated: false
        })

        clearCache("createUser", undefined)

        return newUser
    } catch (error: any) {
        throw new Error(`Error creating new user: ${error.message}`)
    }
}

export async function createuserByMyself(params: { name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }): Promise<UserType>;
export async function createuserByMyself(params: { name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }, type: 'json'): Promise<string>;

export async function createuserByMyself(params: { name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }, type?: 'json') {

    if(!params.currentUserEmail) {
        redirect('/login')
    }

    const currentUser = await User.findOne({ email: params.currentUserEmail });
    
    const permission = hasPermission("/clients", "create", params.role.toLowerCase() as "admin" | 'user', currentUser.role); 

    if(!permission) {
        return
    }

    try {
        const newUser = await User.create({
            name: params.name,
            email: params.email,
            password: generateLongPassword(),
            surname: params.surname || "",
            phoneNumber: params.phoneNumber || "",
            selfCreated: true,
            role: params.role
        })

        clearCache("createUser", undefined)

        if(type === 'json'){
            return JSON.stringify(newUser)
        } else {
            return newUser
        }

    } catch (error: any) {
        throw new Error(`Error adding new user from admin ${error.message}`)
    }
}

export async function editUser(params: { userId: string, name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }): Promise<UserType>;
export async function editUser(params: { userId: string, name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }, type: 'json'): Promise<string>;

export async function editUser(params: { userId: string, name: string, email: string, surname?: string, phoneNumber?: string, role: "Admin" | "User", currentUserEmail: string | null }, type?: 'json') {

    if(!params.currentUserEmail) {
        redirect('/login')
    }

    const currentUser = await User.findOne({ email: params.currentUserEmail });
    
    const permission = hasPermission("/clients", "create", params.role.toLowerCase() as "admin" | 'user', currentUser.role); 

    if(!permission) {
        return
    }

    try {
        const editedUser = await User.findOneAndUpdate(      
            { _id: params.userId },
            {
              name: params.name,
              email: params.email,
              surname: params.surname || "",
              phoneNumber: params.phoneNumber || "",
              role: params.role,
            },
            { new: true, runValidators: true }
        )

        clearCache("createUser", undefined)

        if(type === 'json'){
            return JSON.stringify(editedUser)
        } else {
            return editedUser
        }

    } catch (error: any) {
        throw new Error(`Error adding new user from admin ${error.message}`)
    }
}

export async function populateSelfCreatedUser(params: CreateUserParams): Promise<UserType>;
export async function populateSelfCreatedUser(params: CreateUserParams, type: 'json'): Promise<string>;

export async function populateSelfCreatedUser(params: CreateUserParams, type?: 'json') {
   try {

    const existingUser = await User.findOneAndUpdate(
        { email: params.email },
        { $set: { username: params.username, password: params.password, phoneNumber: params.phoneNumber, discounts: [params.promoCode], selfCreated: false } },
        { new: true, runValidators: true }
    ).select("-password");

    clearCache("createUser", undefined)
    if(type === 'json'){
      return JSON.stringify(existingUser)
    } else {
      return existingUser
    }
   } catch (error: any) {
     throw new Error(`${error.message}`)
   }
}
type FetchUserByEmailparams = {
   email: string
}

export async function fetchUserByEmail(params: FetchUserByEmailparams): Promise<UserType>;
export async function fetchUserByEmail(params: FetchUserByEmailparams, type: 'json'): Promise<string>;

export async function fetchUserByEmail(params: FetchUserByEmailparams, type?: 'json') {
   try {
        connectToDB()
        const currentUser = await User.findOne({ email: params.email}).select("-password")

    if(type === 'json'){
      return JSON.stringify(currentUser)
    } else {
      return currentUser
    }
   } catch (error: any) {
     throw new Error(`${error.message}`)
   }
}

export async function checkForAdmin(email: string){
    try {
        connectToDB();

        const currentUser = await User.findOne({ email: email });

        if(currentUser.isAdmin){
            return true
        } else return false
    } catch (error: any) {
        throw new Error(`Error determining, whether the user is admin ${error.message}`)
    }
}

export async function fetchUserById({ userId }: { userId: string }): Promise<UserType>;
export async function fetchUserById({ userId }: { userId: string }, type: 'json'): Promise<string>;

export async function fetchUserById({ userId }: { userId: string }, type?: 'json') {
   try {

    await connectToDB()
    const currentUser = await User.findById(userId).select("-password");
      
    if(type === 'json'){
      return JSON.stringify(currentUser)
    } else {
      return currentUser
    }
   } catch (error: any) {
     throw new Error(`Error fetching user by id: ${error.message}`)
   }
}

export async function fetchUsers(type?: "json") {
    try {
        connectToDB();

        const users = await User.find().select("-password");

        const fetchedUsers = [];

        for(const user of users) {
            if(user.role !== 'Owner') {
                fetchedUsers.push({ _id: user._id, email: user.email, name: user.name, username: user.username, orders: user.orders.length, role: user.role})
            }
        }
        
        return fetchedUsers;
    } catch (error: any) {
        throw new Error(`Error fetching users: ${error.message}`)
    }
}

export async function fetchUserRole({ email }: { email: string }) {
  try {
    connectToDB();

    const user = await User.findOne({ email });

    if(!user) {
        return
    }

    return user.role
  } catch (error: any) {
    throw new Error(`${error.message}`)
  }
}

export async function resetPassword({
    token,
    newPassword,
  }: {
    token: string;
    newPassword: string;
  }) {
    try {
      await connectToDB();
      
      const user = await User.findOne({
        forgotPasswordToken: token,
        forgotPasswordTokenExpiry: { $gt: new Date() },
      });
  
      if (!user) {
        throw new Error("Invalid or expired token.");
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      user.password = hashedPassword;
      user.forgotPasswordToken = undefined;
      user.forgotPasswordTokenExpiry = undefined;
      await user.save();
    } catch (error: any) {
        throw new Error(`Error reseting password: ${error.message}`)
    }
}

export async function addPromo(params: { userId: string, email: string }): Promise<string> {
    
  try {
    await connectToDB()
    
    const promoCode = await generatePromoCode({ email: params.email, validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, ""), reusabilityTimes: 1, discountPercentage: 5 })

    const user = await User.findByIdAndUpdate(
        params.userId,
        {
            $push: { discounts: promoCode }
        }
    )

    return promoCode
  } catch (error: any) {
    throw new Error(`Error adding promo to user: ${error.message}`)
  }
}