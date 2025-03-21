"use client"

import { Store } from "@/constants/store"
import { motion } from "framer-motion"

const Loader = () => {
  const copperPrimary = "#B87333" 
  const copperSecondary = "#CD7F32"
  const copperAccent = "#E6BE8A"
  const copperDark = "#8B4513"

  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center gap-4 py-4">
      <motion.div
        className="text-small-medium text-slate-700 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Завантаження даних...
      </motion.div>

      <motion.div
        className="text-subtle-medium text-slate-500 text-center max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
        }}
      >
        Підготовка інструментів вашого бізнесу
      </motion.div>

      <div className="w-full max-w-xs mt-2 px-4">
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${copperDark}, ${copperPrimary}, ${copperAccent})` }}
            initial={{ width: "0%" }}
            animate={{
              width: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 5,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
            }}
          />
        </div>
      </div>

      <motion.div
        className="text-tiny-medium text-slate-400 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1, duration: 1 }}
      >
        © Copper Group E-commerce | {new Date().getFullYear()} | {Store.name}
      </motion.div>
    </div>
  )
}

export default Loader

