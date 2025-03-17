"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

const categories = [
  {
    name: "Одяг",
    image: "/assets/1.jpg",
    href: "/catalog?page=1&sort=default&categories=67d2e9ee039a60215d4d9e76%2C67d2ea09039a60215d4da048%2C67d2ea09039a60215d4da04c%2C67d2ea0e039a60215d4da0b5%2C67d2ea0f039a60215d4da0bd%2C67d2ea12039a60215d4da0f5%2C67d2ea14039a60215d4da11f%2C67d2ea14039a60215d4da123%2C67d2ea12039a60215d4da0f9%2C67d2ea13039a60215d4da10f%2C67d2ea13039a60215d4da113%2C67d2ea13039a60215d4da117%2C67d2ea13039a60215d4da11b%2C67d2ea14039a60215d4da127%2C67d2ea14039a60215d4da12b%2C67d2ea14039a60215d4da12f%2C67d2ea15039a60215d4da133%2C67d2ea15039a60215d4da137%2C67d2ea15039a60215d4da13b%2C67d2ea15039a60215d4da13f%2C67d2ea16039a60215d4da143%2C67d2ea16039a60215d4da147%2C67d2ea16039a60215d4da14b%2C67d2ea16039a60215d4da14f%2C67d2ea16039a60215d4da153%2C67d2ea17039a60215d4da157%2C67d2ea17039a60215d4da15b%2C67d2ea17039a60215d4da15f%2C67d2ea17039a60215d4da163%2C67d2ea18039a60215d4da167%2C67d2ea18039a60215d4da16b%2C67d2ea18039a60215d4da16f%2C67d2ea18039a60215d4da173%2C67d2ea18039a60215d4da177%2C67d2ea19039a60215d4da17b%2C67d2ea19039a60215d4da17f%2C67d2ea19039a60215d4da183%2C67d2ea19039a60215d4da187%2C67d2ea1a039a60215d4da18b%2C67d2ea1a039a60215d4da18f%2C67d2ea1a039a60215d4da193%2C67d2ea1b039a60215d4da197%2C67d2ea1b039a60215d4da19b%2C67d2ea1b039a60215d4da19f%2C67d2ea1b039a60215d4da1a3%2C67d2ea1b039a60215d4da1a7%2C67d2ea1c039a60215d4da1ab%2C67d2ea1c039a60215d4da1af%2C67d2ea1c039a60215d4da1b3%2C67d2ea1c039a60215d4da1b7%2C67d2ea1c039a60215d4da1bb%2C67d2ea1d039a60215d4da1bf%2C67d2ea1d039a60215d4da1c3%2C67d2ea1d039a60215d4da1c7%2C67d2ea1d039a60215d4da1cb%2C67d2ea1d039a60215d4da1cf%2C67d2ea1e039a60215d4da1d3%2C67d2ea1e039a60215d4da1d7%2C67d2ea1e039a60215d4da1db%2C67d2ea1e039a60215d4da1df%2C67d2ea1e039a60215d4da1e3%2C67d2ea1f039a60215d4da1e7%2C67d2ea1f039a60215d4da1eb%2C67d2ea1f039a60215d4da1ef%2C67d2ea1f039a60215d4da1f3%2C67d2ea1f039a60215d4da1f7%2C67d2ea20039a60215d4da1fb%2C67d2ea20039a60215d4da1ff%2C67d2ea20039a60215d4da203%2C67d2ea20039a60215d4da207%2C67d2ea21039a60215d4da20b%2C67d2ea21039a60215d4da20f%2C67d2ea21039a60215d4da213%2C67d2ea21039a60215d4da217%2C67d2ea21039a60215d4da21b%2C67d2ea22039a60215d4da21f%2C67d2ea22039a60215d4da223%2C67d2ea22039a60215d4da227%2C67d2ea22039a60215d4da22b%2C67d2ea22039a60215d4da22f%2C67d2ea23039a60215d4da233%2C67d2ea23039a60215d4da237%2C67d2ea24039a60215d4da23b%2C67d2ea24039a60215d4da23f%2C67d2ea25039a60215d4da243%2C67d2ea25039a60215d4da247%2C67d2ea25039a60215d4da24b%2C67d2ea25039a60215d4da24f%2C67d2ea25039a60215d4da253%2C67d2ea26039a60215d4da257%2C67d2ea26039a60215d4da25b%2C67d2ea26039a60215d4da25f%2C67d2ea26039a60215d4da263%2C67d2ea26039a60215d4da267%2C67d2ea27039a60215d4da26b%2C67d2ea27039a60215d4da26f%2C67d2ea27039a60215d4da273%2C67d2ea27039a60215d4da277%2C67d2ea27039a60215d4da27b%2C67d2ea28039a60215d4da27f%2C67d2e9ef039a60215d4d9e7c%2C67d2ea2f039a60215d4da303%2C67d2ea12039a60215d4da100%2C67d2e9ee039a60215d4d9e79%2C67d2ea28039a60215d4da283%2C67d2ea28039a60215d4da287%2C67d2ea28039a60215d4da28b%2C67d2ea29039a60215d4da28f%2C67d2ea29039a60215d4da293%2C67d2ea29039a60215d4da297%2C67d2ea29039a60215d4da29b%2C67d2ea29039a60215d4da29f%2C67d2ea2a039a60215d4da2a3%2C67d2ea2a039a60215d4da2a7%2C67d2ea2a039a60215d4da2ab%2C67d2ea2a039a60215d4da2af%2C67d2ea2a039a60215d4da2b3%2C67d2ea2b039a60215d4da2b7%2C67d2ea2b039a60215d4da2bb%2C67d2ea2b039a60215d4da2bf%2C67d2ea2b039a60215d4da2c3%2C67d2ea2c039a60215d4da2c7%2C67d2ea2c039a60215d4da2cb%2C67d2ea2c039a60215d4da2cf%2C67d2ea2c039a60215d4da2d3%2C67d2ea2d039a60215d4da2d7%2C67d2ea2d039a60215d4da2db%2C67d2ea2d039a60215d4da2df%2C67d2ea2e039a60215d4da2f7%2C67d2ea2e039a60215d4da2fb%2C67d2ea2d039a60215d4da2e3%2C67d2ea2e039a60215d4da2e7%2C67d2ea2e039a60215d4da2eb%2C67d2ea2e039a60215d4da2ef%2C67d2ea2e039a60215d4da2f3%2C67d2ea2f039a60215d4da2ff%2C67d2ea08039a60215d4da03d%2C67d2ea0c039a60215d4da087%2C67d2ea0c039a60215d4da08a%2C67d2e9ee039a60215d4d9e70%2C67d2ea03039a60215d4d9fd9%2C67d2ea03039a60215d4d9fdd%2C67d2ea03039a60215d4d9fe1%2C67d2ea03039a60215d4d9fe5%2C67d2ea04039a60215d4d9fe9%2C67d2ea04039a60215d4d9fed%2C67d2ea04039a60215d4d9ff1%2C67d2ea04039a60215d4d9ff5%2C67d2ea05039a60215d4d9ffd%2C67d2ea05039a60215d4da001%2C67d2ea05039a60215d4da005%2C67d2ea05039a60215d4da009%2C67d2ea06039a60215d4da00d%2C67d2ea06039a60215d4da011%2C67d2ea06039a60215d4da015%2C67d2ea06039a60215d4da019%2C67d2ea06039a60215d4da01d%2C67d2ea07039a60215d4da021%2C67d2ea07039a60215d4da025%2C67d2ea07039a60215d4da029%2C67d2ea07039a60215d4da02d%2C67d2ea07039a60215d4da031%2C67d2ea08039a60215d4da035%2C67d2ea08039a60215d4da039%2C67d2ea09039a60215d4da050%2C67d2ea09039a60215d4da054%2C67d2ea0a039a60215d4da058%2C67d2ea0a039a60215d4da05c%2C67d2ea0a039a60215d4da060%2C67d2ea0a039a60215d4da064%2C67d2ea0a039a60215d4da068%2C67d2ea0b039a60215d4da06c%2C67d2ea0b039a60215d4da070%2C67d2ea0b039a60215d4da074%2C67d2ea0b039a60215d4da078%2C67d2ea0b039a60215d4da07c%2C67d2ea0c039a60215d4da080%2C67d2ea0c039a60215d4da08d%2C67d2ea0c039a60215d4da091%2C67d2ea0f039a60215d4da0b9%2C67d2ea0f039a60215d4da0c1%2C67d2ea0d039a60215d4da095%2C67d2ea0d039a60215d4da09d%2C67d2ea0d039a60215d4da0a1%2C67d2ea0e039a60215d4da0a5%2C67d2ea0e039a60215d4da0a9%2C67d2ea0e039a60215d4da0ad%2C67d2ea0e039a60215d4da0b1%2C67d2ea0f039a60215d4da0c5%2C67d2ea0f039a60215d4da0c9%2C67d2ea10039a60215d4da0cd%2C67d2ea10039a60215d4da0d1%2C67d2e9ee039a60215d4d9e73%2C67d2ea05039a60215d4d9ff9%2C67d2ea08039a60215d4da040%2C67d2ea08039a60215d4da044%2C67d2ea0d039a60215d4da099%2C67d2ea10039a60215d4da0d5%2C67d2ea10039a60215d4da0d9%2C67d2ea10039a60215d4da0dd%2C67d2ea11039a60215d4da0e1%2C67d2ea11039a60215d4da0e5%2C67d2ea11039a60215d4da0e9%2C67d2ea11039a60215d4da0ed%2C67d2ea11039a60215d4da0f1%2C67d2ea0c039a60215d4da084%2C67d2ea13039a60215d4da10c",
    subcategories: [
      { name: "Жіночий одяг", url: "/catalog?page=1&sort=default&categories=67d2e9ee039a60215d4d9e76%2C67d2ea09039a60215d4da048%2C67d2ea09039a60215d4da04c%2C67d2ea0e039a60215d4da0b5%2C67d2ea0f039a60215d4da0bd%2C67d2ea12039a60215d4da0f5%2C67d2ea14039a60215d4da11f%2C67d2ea14039a60215d4da123%2C67d2ea12039a60215d4da0f9%2C67d2ea13039a60215d4da10f%2C67d2ea13039a60215d4da113%2C67d2ea13039a60215d4da117%2C67d2ea13039a60215d4da11b%2C67d2ea14039a60215d4da127%2C67d2ea14039a60215d4da12b%2C67d2ea14039a60215d4da12f%2C67d2ea15039a60215d4da133%2C67d2ea15039a60215d4da137%2C67d2ea15039a60215d4da13b%2C67d2ea15039a60215d4da13f%2C67d2ea16039a60215d4da143%2C67d2ea16039a60215d4da147%2C67d2ea16039a60215d4da14b%2C67d2ea16039a60215d4da14f%2C67d2ea16039a60215d4da153%2C67d2ea17039a60215d4da157%2C67d2ea17039a60215d4da15b%2C67d2ea17039a60215d4da15f%2C67d2ea17039a60215d4da163%2C67d2ea18039a60215d4da167%2C67d2ea18039a60215d4da16b%2C67d2ea18039a60215d4da16f%2C67d2ea18039a60215d4da173%2C67d2ea18039a60215d4da177%2C67d2ea19039a60215d4da17b%2C67d2ea19039a60215d4da17f%2C67d2ea19039a60215d4da183%2C67d2ea19039a60215d4da187%2C67d2ea1a039a60215d4da18b%2C67d2ea1a039a60215d4da18f%2C67d2ea1a039a60215d4da193%2C67d2ea1b039a60215d4da197%2C67d2ea1b039a60215d4da19b%2C67d2ea1b039a60215d4da19f%2C67d2ea1b039a60215d4da1a3%2C67d2ea1b039a60215d4da1a7%2C67d2ea1c039a60215d4da1ab%2C67d2ea1c039a60215d4da1af%2C67d2ea1c039a60215d4da1b3%2C67d2ea1c039a60215d4da1b7%2C67d2ea1c039a60215d4da1bb%2C67d2ea1d039a60215d4da1bf%2C67d2ea1d039a60215d4da1c3%2C67d2ea1d039a60215d4da1c7%2C67d2ea1d039a60215d4da1cb%2C67d2ea1d039a60215d4da1cf%2C67d2ea1e039a60215d4da1d3%2C67d2ea1e039a60215d4da1d7%2C67d2ea1e039a60215d4da1db%2C67d2ea1e039a60215d4da1df%2C67d2ea1e039a60215d4da1e3%2C67d2ea1f039a60215d4da1e7%2C67d2ea1f039a60215d4da1eb%2C67d2ea1f039a60215d4da1ef%2C67d2ea1f039a60215d4da1f3%2C67d2ea1f039a60215d4da1f7%2C67d2ea20039a60215d4da1fb%2C67d2ea20039a60215d4da1ff%2C67d2ea20039a60215d4da203%2C67d2ea20039a60215d4da207%2C67d2ea21039a60215d4da20b%2C67d2ea21039a60215d4da20f%2C67d2ea21039a60215d4da213%2C67d2ea21039a60215d4da217%2C67d2ea21039a60215d4da21b%2C67d2ea22039a60215d4da21f%2C67d2ea22039a60215d4da223%2C67d2ea22039a60215d4da227%2C67d2ea22039a60215d4da22b%2C67d2ea22039a60215d4da22f%2C67d2ea23039a60215d4da233%2C67d2ea23039a60215d4da237%2C67d2ea24039a60215d4da23b%2C67d2ea24039a60215d4da23f%2C67d2ea25039a60215d4da243%2C67d2ea25039a60215d4da247%2C67d2ea25039a60215d4da24b%2C67d2ea25039a60215d4da24f%2C67d2ea25039a60215d4da253%2C67d2ea26039a60215d4da257%2C67d2ea26039a60215d4da25b%2C67d2ea26039a60215d4da25f%2C67d2ea26039a60215d4da263%2C67d2ea26039a60215d4da267%2C67d2ea27039a60215d4da26b%2C67d2ea27039a60215d4da26f%2C67d2ea27039a60215d4da273%2C67d2ea27039a60215d4da277%2C67d2ea27039a60215d4da27b%2C67d2ea28039a60215d4da27f%2C67d2e9ef039a60215d4d9e7c%2C67d2ea2f039a60215d4da303%2C67d2ea12039a60215d4da100%2C67d2ea08039a60215d4da03d%2C67d2ea12039a60215d4da103%2C67d2ea12039a60215d4da106%2C67d2ea13039a60215d4da109%2C67d2ea12039a60215d4da0fd%2C67d2e9ee039a60215d4d9e73%2C67d2ea05039a60215d4d9ff9%2C67d2ea08039a60215d4da040%2C67d2ea08039a60215d4da044%2C67d2ea0d039a60215d4da099%2C67d2ea10039a60215d4da0d5%2C67d2ea10039a60215d4da0d9%2C67d2ea10039a60215d4da0dd%2C67d2ea11039a60215d4da0e1%2C67d2ea11039a60215d4da0e5%2C67d2ea11039a60215d4da0e9%2C67d2ea11039a60215d4da0ed%2C67d2ea11039a60215d4da0f1%2C67d2ea13039a60215d4da10c" },
      { name: "Чоловічий одяг", url: "/catalog?page=1&sort=default&categories=67d2e9ee039a60215d4d9e79%2C67d2ea28039a60215d4da283%2C67d2ea28039a60215d4da287%2C67d2ea28039a60215d4da28b%2C67d2ea29039a60215d4da28f%2C67d2ea29039a60215d4da293%2C67d2ea29039a60215d4da297%2C67d2ea29039a60215d4da29b%2C67d2ea29039a60215d4da29f%2C67d2ea2a039a60215d4da2a3%2C67d2ea2a039a60215d4da2a7%2C67d2ea2a039a60215d4da2ab%2C67d2ea2a039a60215d4da2af%2C67d2ea2a039a60215d4da2b3%2C67d2ea2b039a60215d4da2b7%2C67d2ea2b039a60215d4da2bb%2C67d2ea2b039a60215d4da2bf%2C67d2ea2b039a60215d4da2c3%2C67d2ea2c039a60215d4da2c7%2C67d2ea2c039a60215d4da2cb%2C67d2ea2c039a60215d4da2cf%2C67d2ea2c039a60215d4da2d3%2C67d2ea2d039a60215d4da2d7%2C67d2ea2d039a60215d4da2db%2C67d2ea2d039a60215d4da2df%2C67d2ea2e039a60215d4da2f7%2C67d2ea2e039a60215d4da2fb%2C67d2ea2d039a60215d4da2e3%2C67d2ea2e039a60215d4da2e7%2C67d2ea2e039a60215d4da2eb%2C67d2ea2e039a60215d4da2ef%2C67d2ea2e039a60215d4da2f3%2C67d2ea2f039a60215d4da2ff%2C67d2ea0c039a60215d4da08a" },
      { name: "Дитячий одяг", url: "/catalog?page=1&sort=default&categories=67d2ea0c039a60215d4da084%2C67d2e9ee039a60215d4d9e70%2C67d2ea03039a60215d4d9fd9%2C67d2ea03039a60215d4d9fdd%2C67d2ea03039a60215d4d9fe1%2C67d2ea03039a60215d4d9fe5%2C67d2ea04039a60215d4d9fe9%2C67d2ea04039a60215d4d9fed%2C67d2ea04039a60215d4d9ff1%2C67d2ea04039a60215d4d9ff5%2C67d2ea05039a60215d4d9ffd%2C67d2ea05039a60215d4da001%2C67d2ea05039a60215d4da005%2C67d2ea05039a60215d4da009%2C67d2ea06039a60215d4da00d%2C67d2ea06039a60215d4da011%2C67d2ea06039a60215d4da015%2C67d2ea06039a60215d4da019%2C67d2ea06039a60215d4da01d%2C67d2ea07039a60215d4da021%2C67d2ea07039a60215d4da025%2C67d2ea07039a60215d4da029%2C67d2ea07039a60215d4da02d%2C67d2ea07039a60215d4da031%2C67d2ea08039a60215d4da035%2C67d2ea08039a60215d4da039%2C67d2ea09039a60215d4da050%2C67d2ea09039a60215d4da054%2C67d2ea0a039a60215d4da058%2C67d2ea0a039a60215d4da05c%2C67d2ea0a039a60215d4da060%2C67d2ea0a039a60215d4da064%2C67d2ea0a039a60215d4da068%2C67d2ea0b039a60215d4da06c%2C67d2ea0b039a60215d4da070%2C67d2ea0b039a60215d4da074%2C67d2ea0b039a60215d4da078%2C67d2ea0b039a60215d4da07c%2C67d2ea0c039a60215d4da080%2C67d2ea0c039a60215d4da08d%2C67d2ea0c039a60215d4da091%2C67d2ea0f039a60215d4da0b9%2C67d2ea0f039a60215d4da0c1%2C67d2ea0d039a60215d4da095%2C67d2ea0d039a60215d4da09d%2C67d2ea0d039a60215d4da0a1%2C67d2ea0e039a60215d4da0a5%2C67d2ea0e039a60215d4da0a9%2C67d2ea0e039a60215d4da0ad%2C67d2ea0e039a60215d4da0b1%2C67d2ea0f039a60215d4da0c5%2C67d2ea0f039a60215d4da0c9%2C67d2ea10039a60215d4da0cd%2C67d2ea10039a60215d4da0d1%2C67d2ea0c039a60215d4da08a%2C67d2ea0c039a60215d4da087%2C67d2ea08039a60215d4da03d%2C67d2ea09039a60215d4da048%2C67d2ea09039a60215d4da04c%2C67d2ea0f039a60215d4da0bd%2C67d2ea0e039a60215d4da0b5%2C67d2ea12039a60215d4da0f9" }
    ],
    featured: true,
  },
  {
    name: "Взуття",
    image: "/assets/2.jpg",
    href: "/catalog?page=1&sort=default&categories=67d2ea22039a60215d4da22b%2C67d2ea22039a60215d4da22f%2C67d2ea23039a60215d4da233%2C67d2ea23039a60215d4da237%2C67d2ea24039a60215d4da23b%2C67d2ea24039a60215d4da23f%2C67d2ea25039a60215d4da243%2C67d2ea25039a60215d4da247%2C67d2ea25039a60215d4da24b%2C67d2ea25039a60215d4da24f%2C67d2ea25039a60215d4da253%2C67d2ea26039a60215d4da257%2C67d2ea26039a60215d4da25b%2C67d2ea26039a60215d4da25f%2C67d2ea26039a60215d4da263%2C67d2ea26039a60215d4da267%2C67d2ea27039a60215d4da26b%2C67d2ea27039a60215d4da26f%2C67d2ea2e039a60215d4da2fb%2C67d2ea2e039a60215d4da2f7%2C67d2ea2d039a60215d4da2e3%2C67d2ea2e039a60215d4da2e7%2C67d2ea2e039a60215d4da2eb%2C67d2ea2e039a60215d4da2ef%2C67d2ea2e039a60215d4da2f3%2C67d2ea2f039a60215d4da2ff%2C67d2e9ee039a60215d4d9e73%2C67d2ea10039a60215d4da0d5%2C67d2ea10039a60215d4da0d9%2C67d2ea10039a60215d4da0dd%2C67d2ea11039a60215d4da0e1%2C67d2ea11039a60215d4da0e5%2C67d2ea11039a60215d4da0e9%2C67d2ea11039a60215d4da0ed%2C67d2ea11039a60215d4da0f1%2C67d2ea0c039a60215d4da091%2C67d2ea0d039a60215d4da0a1%2C67d2ea0f039a60215d4da0c9%2C67d2ea10039a60215d4da0cd%2C67d2ea10039a60215d4da0d1",
    subcategories: [
      { name: "Дитяче", url: "/catalog?page=1&sort=default&categories=67d2ea2e039a60215d4da2fb%2C67d2ea2e039a60215d4da2f7%2C67d2e9ee039a60215d4d9e73%2C67d2ea10039a60215d4da0d5%2C67d2ea10039a60215d4da0d9%2C67d2ea10039a60215d4da0dd%2C67d2ea11039a60215d4da0e1%2C67d2ea11039a60215d4da0e5%2C67d2ea11039a60215d4da0e9%2C67d2ea11039a60215d4da0ed%2C67d2ea11039a60215d4da0f1%2C67d2ea0c039a60215d4da091%2C67d2ea0d039a60215d4da0a1%2C67d2ea0f039a60215d4da0c9%2C67d2ea10039a60215d4da0cd%2C67d2ea10039a60215d4da0d1" },
      { name: "Жіноче", url: "/catalog?page=1&sort=default&categories=67d2ea22039a60215d4da22b%2C67d2ea22039a60215d4da22f%2C67d2ea23039a60215d4da233%2C67d2ea23039a60215d4da237%2C67d2ea24039a60215d4da23b%2C67d2ea24039a60215d4da23f%2C67d2ea25039a60215d4da243%2C67d2ea25039a60215d4da247%2C67d2ea25039a60215d4da24b%2C67d2ea25039a60215d4da24f%2C67d2ea25039a60215d4da253%2C67d2ea26039a60215d4da257%2C67d2ea26039a60215d4da25b%2C67d2ea26039a60215d4da25f%2C67d2ea26039a60215d4da263%2C67d2ea26039a60215d4da267%2C67d2ea27039a60215d4da26b%2C67d2ea27039a60215d4da26f%2C67d2e9ee039a60215d4d9e73%2C67d2ea10039a60215d4da0d9%2C67d2ea10039a60215d4da0dd%2C67d2ea11039a60215d4da0e1%2C67d2ea11039a60215d4da0e5%2C67d2ea11039a60215d4da0e9%2C67d2ea11039a60215d4da0ed%2C67d2ea11039a60215d4da0f1%2C67d2ea10039a60215d4da0d5" },
      { name: "Чоловіче", url: "/catalog?page=1&sort=default&categories=67d2ea2e039a60215d4da2fb%2C67d2ea2e039a60215d4da2f7%2C67d2ea2d039a60215d4da2e3%2C67d2ea2e039a60215d4da2e7%2C67d2ea2e039a60215d4da2eb%2C67d2ea2e039a60215d4da2ef%2C67d2ea2e039a60215d4da2f3%2C67d2ea2f039a60215d4da2ff%2C67d2ea0c039a60215d4da091%2C67d2ea0d039a60215d4da0a1%2C67d2ea0f039a60215d4da0c9%2C67d2ea10039a60215d4da0cd%2C67d2ea10039a60215d4da0d1" }
    ],
    featured: false,
  },
  {
    name: "Продукти",
    image: "/assets/3.jpg",
    href: "/catalog?page=1&sort=default&categories=67d2e9f5039a60215d4d9ed4%2C67d2e9f6039a60215d4d9ee0%2C67d2e9f8039a60215d4d9f10%2C67d2e9f9039a60215d4d9f24%2C67d2e9fa039a60215d4d9f30%2C67d2e9fa039a60215d4d9f28%2C67d2e9fa039a60215d4d9f2c%2C67d2e9f6039a60215d4d9eec%2C67d2e9f7039a60215d4d9ef0%2C67d2e9f7039a60215d4d9ef4%2C67d2e9f7039a60215d4d9ef8%2C67d2e9f7039a60215d4d9efc%2C67d2e9f8039a60215d4d9f00%2C67d2e9f8039a60215d4d9f04%2C67d2e9f8039a60215d4d9f08%2C67d2e9f8039a60215d4d9f0c%2C67d2e9f6039a60215d4d9ee8%2C67d2e9f5039a60215d4d9ed8%2C67d2e9f6039a60215d4d9ee4",
    subcategories: [
      { name: "Консерви", url: "/catalog?page=1&sort=default&categories=67d2e9f5039a60215d4d9ed4%2C67d2e9f6039a60215d4d9ee0" },
      { name: "Напої", url: "/catalog?page=1&sort=default&categories=67d2e9f8039a60215d4d9f10%2C67d2e9f9039a60215d4d9f24%2C67d2e9fa039a60215d4d9f30%2C67d2e9fa039a60215d4d9f28%2C67d2e9fa039a60215d4d9f2c" },
      { name: "Солодощі", url: "/catalog?page=1&sort=default&categories=67d2e9f6039a60215d4d9eec%2C67d2e9f7039a60215d4d9ef0%2C67d2e9f7039a60215d4d9ef4%2C67d2e9f7039a60215d4d9ef8%2C67d2e9f7039a60215d4d9efc%2C67d2e9f8039a60215d4d9f00%2C67d2e9f8039a60215d4d9f04%2C67d2e9f8039a60215d4d9f08%2C67d2e9f8039a60215d4d9f0c%2C67d2e9f6039a60215d4d9ee8%2C67d2e9f5039a60215d4d9ed8%2C67d2e9f6039a60215d4d9ee4" }
    ],
    featured: false,
  },
  {
    name: "Все для дому",
    image: "/assets/4.jpg",
    href: "/catalog?page=1&sort=default&categories=67d2e9fa039a60215d4d9f34%2C67d2e9ed039a60215d4d9e61%2C67d2e9ff039a60215d4d9f94%2C67d2e9ff039a60215d4d9f98%2C67d2ea00039a60215d4d9f9c%2C67d2ea00039a60215d4d9fa0%2C67d2e9ee039a60215d4d9e64%2C67d2e9fb039a60215d4d9f3c%2C67d2e9fb039a60215d4d9f48%2C67d2e9fb039a60215d4d9f4c%2Ccategories=67d2e9fc039a60215d4d9f5c%2C67d2e9fc039a60215d4d9f58%2C67d2e9fd039a60215d4d9f60%2C67d2e9fb039a60215d4d9f40%2C67d2e9fb039a60215d4d9f44%2C67d2e9fc039a60215d4d9f50%2C67d2e9fc039a60215d4d9f54%2C67d2e9fd039a60215d4d9f68%2C67d2e9fd039a60215d4d9f6c%2C67d2e9fd039a60215d4d9f70%2C67d2ea01039a60215d4d9fbc%2C67d2ea02039a60215d4d9fc0%2C67d2ea02039a60215d4d9fc4%2C67d2ea02039a60215d4d9fc8%2C67d2ea02039a60215d4d9fcc%2C67d2ea02039a60215d4d9fd1%2C67d2ea03039a60215d4d9fd5%2C67d2e9ef039a60215d4d9e7f%2C67d2e9f0039a60215d4d9e83%2C67d2e9f0039a60215d4d9e87%2C67d2e9ee039a60215d4d9e64%2C67d2e9fa039a60215d4d9f38%2C67d2e9fb039a60215d4d9f3c%2C67d2e9fb039a60215d4d9f40%2C67d2e9fb039a60215d4d9f44%2C67d2e9fb039a60215d4d9f48%2C67d2e9fb039a60215d4d9f4c%2C67d2e9fc039a60215d4d9f50%2C67d2e9fc039a60215d4d9f54%2C67d2e9fc039a60215d4d9f58%2C67d2e9fc039a60215d4d9f5c%2C67d2e9fd039a60215d4d9f60%2C67d2e9ff039a60215d4d9f94%2C67d2e9ff039a60215d4d9f98%2C67d2ea00039a60215d4d9f9c%2C67d2ea00039a60215d4d9fa0",
    subcategories: [
      { name: "Постільна білизна", url: "/catalog?page=1&sort=default&categories=67d2e9fa039a60215d4d9f34%2C67d2e9ed039a60215d4d9e61%2C67d2e9ff039a60215d4d9f94%2C67d2e9ff039a60215d4d9f98%2C67d2ea00039a60215d4d9f9c%2C67d2ea00039a60215d4d9fa0%2C67d2e9ee039a60215d4d9e64%2C67d2e9fb039a60215d4d9f3c%2C67d2e9fb039a60215d4d9f48%2C67d2e9fb039a60215d4d9f4c" },
      { name: "Декор", url: "/catalog?page=1&sort=default&categories=67d2e9fc039a60215d4d9f5c%2C67d2e9fc039a60215d4d9f58%2C67d2e9fd039a60215d4d9f60%2C67d2e9fb039a60215d4d9f40%2C67d2e9fb039a60215d4d9f44%2C67d2e9fc039a60215d4d9f50%2C67d2e9fc039a60215d4d9f54%2C67d2e9fd039a60215d4d9f68%2C67d2e9fd039a60215d4d9f6c%2C67d2e9fd039a60215d4d9f70%2C67d2ea01039a60215d4d9fbc%2C67d2ea02039a60215d4d9fc0%2C67d2ea02039a60215d4d9fc4%2C67d2ea02039a60215d4d9fc8%2C67d2ea02039a60215d4d9fcc%2C67d2ea02039a60215d4d9fd1%2C67d2ea03039a60215d4d9fd5%2C67d2e9ef039a60215d4d9e7f%2C67d2e9f0039a60215d4d9e83%2C67d2e9f0039a60215d4d9e87" },
      { name: "Домашній текстиль", url: "/catalog?page=1&sort=default&categories=67d2e9ee039a60215d4d9e64%2C67d2e9fa039a60215d4d9f38%2C67d2e9fb039a60215d4d9f3c%2C67d2e9fb039a60215d4d9f40%2C67d2e9fb039a60215d4d9f44%2C67d2e9fb039a60215d4d9f48%2C67d2e9fb039a60215d4d9f4c%2C67d2e9fc039a60215d4d9f50%2C67d2e9fc039a60215d4d9f54%2C67d2e9fc039a60215d4d9f58%2C67d2e9fc039a60215d4d9f5c%2C67d2e9fd039a60215d4d9f60%2C67d2e9ff039a60215d4d9f94%2C67d2e9ff039a60215d4d9f98%2C67d2ea00039a60215d4d9f9c%2C67d2ea00039a60215d4d9fa0" }
    ],
    featured: true,
  },
]


export default function Categories() {
  const controls = useAnimation()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [controls, isInView])

  return (
    <motion.section
      ref={sectionRef}
      className="w-full bg-gradient-to-b from-white to-[#f9fafb] py-20 relative overflow-hidden -mt-28"
      initial="hidden"
      animate={controls}
      variants={{
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
      }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" id="categories">

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* First featured category - spans 7 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-7 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: -30 },
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-3/5 relative">
                  <Link href={categories[0].href} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src={categories[0].image || "/placeholder.svg?height=500&width=400"}
                        alt={categories[0].name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"></div>

                      <div className="absolute bottom-0 left-0 p-8">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-1 bg-[#FECC02] mr-3"></div>
                          <span className="text-small-semibold uppercase tracking-wider text-white opacity-90">
                            Категорія
                          </span>
                        </div>
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">{categories[0].name}</h3>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="lg:w-2/5 p-8 flex flex-col justify-center">
                  <div className="space-y-4 mb-6">
                  {categories[0].subcategories.map((subcategory, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subcategory.url}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>{subcategory.name}</span>
                    </Link>
                  ))}
                  </div>

                  <Link
                    href={categories[0].href}
                    className="text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center"
                  >
                    <span>Переглянути всі</span>
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Second category - spans 5 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-5 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: 30 },
            }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <Link href={categories[1].href} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={categories[1].image || "/placeholder.svg?height=500&width=400"}
                    alt={categories[1].name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-0.5 bg-[#FECC02] mr-2"></div>
                      <span className="text-subtle-semibold uppercase tracking-wider text-white opacity-90">
                        Категорія
                      </span>
                    </div>
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">{categories[1].name}</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {categories[1].subcategories.map((subcategory, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subcategory.url}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>{subcategory.name}</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href={categories[1].href}
                  className="text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4"
                >
                  <span>Переглянути всі</span>
                  <ChevronRight className="ml-1 w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Third category - spans 5 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-5 relative"
            variants={{
              visible: { opacity: 1, y: 0 },
              hidden: { opacity: 0, y: 30 },
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <Link href={categories[2].href} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={categories[2].image || "/placeholder.svg?height=500&width=400"}
                    alt={categories[2].name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-0.5 bg-[#FECC02] mr-2"></div>
                      <span className="text-subtle-semibold uppercase tracking-wider text-white opacity-90">
                        Категорія
                      </span>
                    </div>
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">{categories[2].name}</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {categories[2].subcategories.map((subcategory, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subcategory.url}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>{subcategory.name}</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href={categories[2].href}
                  className="text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4"
                >
                  <span>Переглянути всі</span>
                  <ChevronRight className="ml-1 w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Fourth featured category - spans 7 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-7 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: -30 },
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-2/5 p-8 flex flex-col justify-center order-2 lg:order-1">
                  <div className="space-y-4 mb-6">
                    {categories[3].subcategories.map((subcategory, subIndex) => (
                      <Link
                        key={subIndex}
                        href={subcategory.url}
                        className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                      >
                        <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                          <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                        </span>
                        <span>{subcategory.name}</span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={categories[3].href}
                    className="text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center"
                  >
                    <span>Переглянути всі</span>
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>

                <div className="lg:w-3/5 relative order-1 lg:order-2">
                  <Link href={categories[3].href} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src={categories[3].image || "/placeholder.svg?height=500&width=400"}
                        alt={categories[3].name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"></div>

                      <div className="absolute bottom-0 right-0 p-8 text-right">
                        <div className="flex items-center justify-end mb-3">
                          <span className="text-small-semibold uppercase tracking-wider text-white opacity-90">
                            Категорія
                          </span>
                          <div className="w-8 h-1 bg-[#FECC02] ml-3"></div>
                        </div>
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">{categories[3].name}</h3>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="text-center mt-16"
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 },
          }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/catalog?page=1&sort=default"
            title="Каталог"
            className="inline-block text-base-semibold text-white bg-[#006AA7] hover:bg-[#005a8e] px-8 py-4 rounded-full transition-colors duration-300 shadow-sm"
          >
            <span className="flex items-center">
              Переглянути всі категорії
              <ChevronRight className="ml-2 w-4 h-4" />
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

