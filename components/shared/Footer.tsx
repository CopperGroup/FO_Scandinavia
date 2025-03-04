import Image from "next/image"
import Link from "next/link"
import { Facebook, Instagram, Linkedin } from "lucide-react"
import { Store } from "@/constants/store"

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  return (
    <footer className="bg-gray-900 text-white z-40 pt-16 pb-8 w-full min-w-[320px]">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Фіз. особам</h3>
            <ul className="space-y-2">
              <li>
                <Link href="info/contacts" className="text-sky-300 hover:text-yellow-400 transition-colors">
                  Контакти
                </Link>
              </li>
              <li>
                <Link href="info/delivery-payment" className="hover:text-yellow-400 transition-colors">
                  Доставка та оплата
                </Link>
              </li>
              <li>
                <Link href="info/warranty-services" className="text-sky-300 hover:text-yellow-400 transition-colors">
                  Гарантія та сервіс
                </Link>
              </li>
            </ul>
          </div>

          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Дизайн</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/presentations" className="text-sky-300 hover:text-yellow-400 transition-colors">
                  Презентації
                </Link>
              </li>
            </ul>
          </div>

          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Каталоги</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog" className="hover:text-yellow-400 transition-colors">
                  Смаколики
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="text-sky-300 hover:text-yellow-400 transition-colors">
                  Смаколики
                </Link>
              </li>
              <li>
                <Link href="/catalog" className="hover:text-yellow-400 transition-colors">
                  Смаколики
                </Link>
              </li>
            </ul>
          </div>

          <div className="w-full">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Контакти</h3>
            <p className="mb-2 text-sky-300">Phone:</p>
            <p className="mb-4">Email: </p>
            <h4 className="text-lg font-semibold mb-2 text-yellow-400">Ми в соцмережах</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-sky-400 hover:text-sky-300 transition-colors">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-yellow-400 hover:text-yellow-300 transition-colors">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-sky-400 hover:text-sky-300 transition-colors">
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-sky-800 pt-8 mt-8 w-full">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 mb-4 lg:mb-0 text-center lg:text-left">
              © {currentYear} <span className="font-semibold text-yellow-400">{Store.name}</span>. Всі права захищені.
            </p>
            <div className="flex flex-col items-center lg:items-end space-y-2 lg:space-y-0">
              <span className="text-sm text-sky-300 text-center lg:text-right">Солодко</span>
              <div className="flex space-x-2 mt-2 lg:mt-1">
                <Image
                  className="h-6 w-auto"
                  width={88}
                  height={18}
                  src="/assets/botticelli.png"
                  alt="Botticelli logo"
                />
                <Image className="h-6 w-auto" width={55} height={18} src="/assets/juventa.png" alt="Juventa logo" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

