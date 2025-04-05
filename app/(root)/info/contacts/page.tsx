import { fetchPageDataByNameCache } from "@/lib/actions/cache"
import { transformPageDataInputs } from "@/lib/utils"
import { Mail, Phone } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Контакти",
  description: "Зв'яжіться з нашою командою",
}

export default async function ContactsPage() {

  const result = await fetchPageDataByNameCache("Contacts");

  const data = transformPageDataInputs(JSON.parse(result).dataInputs)

  return (
    <div className="min-h-screen relative">
      {/* Background elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute top-1/2 -right-24 w-96 h-96 bg-yellow-400 rounded-full opacity-20 blur-3xl"></div>

      <div className="container mx-auto px-6 py-24 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-16">
            <div className="h-0.5 w-8 bg-blue-500 rounded-full mr-4 opacity-70"></div>
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight">Контакти</h1>
            <div className="h-0.5 w-8 bg-yellow-500 rounded-full ml-4 opacity-70"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="group">
              <div className="backdrop-blur-lg bg-white/60 rounded-2xl overflow-hidden border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(0,105,255,0.1)] group-hover:-translate-y-1">
                <div className="h-1 bg-gradient-to-r from-blue-400/80 to-blue-600/80 backdrop-blur-sm"></div>
                <div className="p-10 relative">
                  {/* Glass highlight effect */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70"></div>

                  <div className="flex items-center gap-5 mb-6">
                    <div className="bg-blue-500/10 backdrop-blur-sm p-4 rounded-xl border border-blue-500/20">
                      <Mail className="h-7 w-7 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Електронна пошта</h2>
                  </div>

                  <a
                    href={`mailto:${data["Email"]}`}
                    className="text-xl text-blue-600 hover:text-blue-700 font-medium block mt-2 transition-colors"
                  >
                    {data["Email"]}
                  </a>

                  <div className="mt-8 pt-6 border-t border-gray-200/50">
                    <p className="text-gray-600 text-sm">Ми відповідаємо на всі запити протягом 24 годин</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="backdrop-blur-lg bg-white/60 rounded-2xl overflow-hidden border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(255,186,0,0.1)] group-hover:-translate-y-1">
                <div className="h-1 bg-gradient-to-r from-yellow-400/80 to-yellow-500/80 backdrop-blur-sm"></div>
                <div className="p-10 relative">
                  {/* Glass highlight effect */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70"></div>

                  <div className="flex items-center gap-5 mb-6">
                    <div className="bg-yellow-500/10 backdrop-blur-sm p-4 rounded-xl border border-yellow-500/20">
                      <Phone className="h-7 w-7 text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Телефон</h2>
                  </div>

                  <a
                    href={`tel:${data["Телефон"]}`}
                    className="text-xl text-yellow-600 hover:text-yellow-700 font-medium block mt-2 transition-colors"
                  >
                    {data["Телефон"]}
                  </a>

                  <div className="mt-8 pt-6 border-t border-gray-200/50">
                    <p className="text-gray-600 text-sm">Працюємо з {data["Працюємо з"]}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 text-center">
            <div className="inline-block backdrop-blur-md bg-white/40 px-8 py-4 rounded-full border border-white/60 shadow-sm">
              <p className="text-gray-700 font-medium">Ми завжди раді допомогти вам з будь-якими питаннями</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

