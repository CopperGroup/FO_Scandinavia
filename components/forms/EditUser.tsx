"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { userSchema } from "@/lib/validations/user"
import { Label } from "@/components/ui/label"
import OwnerContent from "../admin-components/OwnerContent"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, X, User, Mail, Phone, ShieldCheck } from 'lucide-react'
import { editUser } from "@/lib/actions/user.actions"

type FormData = z.infer<typeof userSchema> & { role: "User" | "Admin" }

export function EditUserForm({
  stringifiedCurrentUser,
  stringifiedUser,
}: { stringifiedCurrentUser: string; stringifiedUser: string }) {
  const user = JSON.parse(stringifiedUser)
  const currentUser = JSON.parse(stringifiedCurrentUser)
  const [isEditing, setIsEditing] = useState(false)
  const [roleChanged, setRoleChanged] = useState(false)
  const [adminConfirmation, setAdminConfirmation] = useState("")

  const form = useForm<FormData>({
    resolver: zodResolver(
      userSchema.extend({
        role: z.enum(["User", "Admin"]),
      }),
    ),
    defaultValues: {
      name: user.name,
      surname: user.surname || "",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      role: user.role as "User" | "Admin",
    },
  })

  const handleSubmit = async (values: FormData) => {
    if (roleChanged && values.role === "Admin" && adminConfirmation !== "Так") {
      form.setError("role", { message: 'Введіть "Так" для підтвердження ролі адміністратора' })
      return
    }

    // Here you would typically update the user data
    console.log("Updated user data:", values)

    await editUser(
        {
          userId: user._id,
          name: values.name,
          email: values.email,
          surname: values.surname,
          phoneNumber: values.phoneNumber,
          role: values.role,
          currentUserEmail: currentUser.email
        },
        "json"
      );

    setIsEditing(false)
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h2 className="text-heading3-bold text-slate-800">Особиста інформація</h2>
        <Button 
          onClick={() => setIsEditing(!isEditing)} 
          variant={isEditing ? "outline" : "default"}
          size="sm"
          className={`text-small-semibold ${isEditing ? "border-slate-200 text-slate-700" : "text-white"}`}
        >
          {isEditing ? <><X className="h-4 w-4 mr-1.5"/>Скасувати</> : <><Edit className="h-4 w-4 mr-1.5"/>Редагувати</>}
        </Button>
      </div>

      {isEditing ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-small-semibold text-slate-700">Ім&apos;я</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-small-medium h-9" />
                    </FormControl>
                    <FormMessage className="text-subtle-medium text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-small-semibold text-slate-700">Прізвище</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-small-medium h-9" />
                    </FormControl>
                    <FormMessage className="text-subtle-medium text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-small-semibold text-slate-700">Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="text-small-medium h-9" />
                    </FormControl>
                    <FormMessage className="text-subtle-medium text-red-500" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-small-semibold text-slate-700">Номер телефону</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} className="text-small-medium h-9" />
                    </FormControl>
                    <FormMessage className="text-subtle-medium text-red-500" />
                  </FormItem>
                )}
              />
            </div>
            
            <OwnerContent role={currentUser.role}>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-small-semibold text-slate-700 flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-1.5 text-slate-500" />
                        Роль користувача
                      </FormLabel>
                      <Select onValueChange={(value) => {field.onChange(value), setRoleChanged(true)}} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-small-medium h-9 w-full md:w-1/2">
                            <SelectValue placeholder="Оберіть роль" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="User" className="text-small-medium">Користувач</SelectItem>
                          <SelectItem value="Admin" className="text-small-medium">Адміністратор</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-subtle-medium text-red-500" />
                    </FormItem>
                  )}
                />
                {roleChanged && form.getValues("role") === "Admin" && (
                  <div className="mt-3 w-full md:w-1/2">
                    <Label htmlFor="admin-confirmation" className="text-small-medium text-slate-700">
                      Введіть <span className="text-red-500 font-medium">Так</span> для підтвердження
                    </Label>
                    <Input
                      id="admin-confirmation"
                      value={adminConfirmation}
                      onChange={(e) => setAdminConfirmation(e.target.value)}
                      placeholder="Введіть 'Так' для підтвердження"
                      className="text-small-medium h-9 mt-1"
                    />
                  </div>
                )}
              </div>
            </OwnerContent>
            
            <div className="mt-4 flex justify-end">
              <Button type="submit" size="sm" className="text-small-semibold text-white">
                Зберегти зміни
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
            <div className="flex items-start">
              <User className="h-4 w-4 mt-0.5 mr-2 text-slate-500" />
              <div>
                <p className="text-small-regular text-slate-500">Повне ім&apos;я</p>
                <p className="text-base-medium text-slate-800">
                  {user.name} {user.surname}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Mail className="h-4 w-4 mt-0.5 mr-2 text-slate-500" />
              <div>
                <p className="text-small-regular text-slate-500">Email</p>
                <Link
                  href={`mailto:${user.email}`}
                  className="text-base-medium text-primary-experimental hover:underline"
                >
                  {user.email}
                </Link>
              </div>
            </div>
            
            {user.phoneNumber && (
              <div className="flex items-start">
                <Phone className="h-4 w-4 mt-0.5 mr-2 text-slate-500" />
                <div>
                  <p className="text-small-regular text-slate-500">Номер телефону</p>
                  <Link
                    href={`tel:${user.phoneNumber}`}
                    className="text-base-medium text-primary-experimental hover:underline"
                  >
                    {user.phoneNumber}
                  </Link>
                </div>
              </div>
            )}
            
            <div className="flex items-start">
              <ShieldCheck className="h-4 w-4 mt-0.5 mr-2 text-slate-500" />
              <div>
                <p className="text-small-regular text-slate-500">Роль користувача</p>
                <p className={`text-base-medium ${user.role === "Admin" ? "text-red-500" : "text-green-500"}`}>
                  {user.role === "Admin" ? "Адміністратор" : "Користувач"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
