/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	fontSize: {
		'xs': [
			'0.75rem', // 12px
			{ lineHeight: '1.333' } // calc(1 / 0.75)
		],
		'sm': [
			'0.875rem', // 14px
			{ lineHeight: '1.428' } // calc(1.25 / 0.875)
		],
		'base': [
			'1rem', // 16px
			{ lineHeight: '1.5' } // calc(1.5 / 1)
		],
		'lg': [
			'1.125rem', // 18px
			{ lineHeight: '1.556' } // calc(1.75 / 1.125)
		],
		'xl': [
			'1.25rem', // 20px
			{ lineHeight: '1.4' } // calc(1.75 / 1.25)
		],
		'2xl': [
			'1.5rem', // 24px
			{ lineHeight: '1.333' } // calc(2 / 1.5)
		],
		'3xl': [
			'1.875rem', // 30px
			{ lineHeight: '1.2' } // calc(2.25 / 1.875)
		],
		'4xl': [
			'2.25rem', // 36px
			{ lineHeight: '1.111' } // calc(2.5 / 2.25)
		],
		'5xl': [
			'3rem', // 48px
			{ lineHeight: '1' }
		],
		'6xl': [
			'3.75rem', // 60px
			{ lineHeight: '1' }
		],
		'7xl': [
			'4.5rem', // 72px
			{ lineHeight: '1' }
		],
		'8xl': [
			'6rem', // 96px
			{ lineHeight: '1' }
		],
		'9xl': [
			'8rem', // 128px
			{ lineHeight: '1' }
		],
  		'responsive-heading': [
  			'clamp(40px, 6vw, 80px)',
  			{
  				lineHeight: 'clamp(50px, 7vw, 88px)'
  			}
  		],
  		'heading1-bold': [
  			'36px',
  			{
  				lineHeight: '140%',
  				fontWeight: '700'
  			}
  		],
  		'heading1-semibold': [
  			'36px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'heading2-bold': [
  			'30px',
  			{
  				lineHeight: '140%',
  				fontWeight: '700'
  			}
  		],
  		'heading2-semibold': [
  			'30px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'heading3-bold': [
  			'24px',
  			{
  				lineHeight: '140%',
  				fontWeight: '700'
  			}
  		],
  		'heading4-medium': [
  			'20px',
  			{
  				lineHeight: '140%',
  				fontWeight: '500'
  			}
  		],
  		'body-bold': [
  			'18px',
  			{
  				lineHeight: '140%',
  				fontWeight: '900'
  			}
  		],
  		'body-semibold': [
  			'18px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'body-medium': [
  			'18px',
  			{
  				lineHeight: '140%',
  				fontWeight: '500'
  			}
  		],
  		'body-normal': [
  			'18px',
  			{
  				lineHeight: '140%',
  				fontWeight: '400'
  			}
  		],
  		'body1-bold': [
  			'18px',
  			{
  				lineHeight: '140%',
  				fontWeight: '700'
  			}
  		],
  		'base-regular': [
  			'16px',
  			{
  				lineHeight: '140%',
  				fontWeight: '400'
  			}
  		],
  		'base-medium': [
  			'16px',
  			{
  				lineHeight: '140%',
  				fontWeight: '500'
  			}
  		],
  		'base-semibold': [
  			'16px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'base1-semibold': [
  			'16px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'small-regular': [
  			'14px',
  			{
  				lineHeight: '140%',
  				fontWeight: '400'
  			}
  		],
  		'small-medium': [
  			'14px',
  			{
  				lineHeight: '140%',
  				fontWeight: '500'
  			}
  		],
  		'small-semibold': [
  			'14px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'small-x-semibold': [
  			'15px',
  			{
  				lineHeight: '140%',
  				fontWeight: '600'
  			}
  		],
  		'subtle-medium': [
  			'12px',
  			{
  				lineHeight: '16px',
  				fontWeight: '500'
  			}
  		],
  		'subtle-semibold': [
  			'12px',
  			{
  				lineHeight: '16px',
  				fontWeight: '600'
  			}
  		],
  		'tiny-medium': [
  			'10px',
  			{
  				lineHeight: '140%',
  				fontWeight: '500'
  			}
  		],
  		'x-small-semibold': [
  			'7px',
  			{
  				lineHeight: '9.318px',
  				fontWeight: '600'
  			}
  		]
  	},
  	extend: {
  		colors: {
  			'theme-3': 'rgb(254, 204, 2)',
  			'primary': '#171717',
			'primary-foreground': "#ffffff",
  			'secondary-500': '#FFB620',
  			'primary-experimental': 'rgba(37,99,235,0.9)',
  			'secondary-experimental': '#0a3a40',
  			'muted-normal': '#f0f0f0',
  			glass: 'rgba(255, 255, 255, 0.33)',
  			blue: '#0095F6',
  			'logout-btn': '#FF5A5A',
  			'navbar-menu': 'rgba(16, 16, 18, 0.6)',
  			'dark-1': '#000000',
  			'dark-2': '#121417',
  			'dark-3': '#101012',
  			'dark-4': '#1F1F22',
  			'light-1': '#FFFFFF',
  			'light-2': '#EFEFEF',
  			'light-3': '#7878A3',
  			'light-4': '#5C5C7B',
  			'gray-1': '#697C89',
			'blue-50': 'oklch(0.97 0.014 254.604)',
			'blue-100': 'oklch(0.932 0.032 255.585)',
			'blue-200': 'oklch(0.882 0.059 254.128)',
			'blue-300': 'oklch(0.809 0.105 251.813)',
			'blue-400': 'oklch(0.707 0.165 254.624)',
			'blue-500': 'oklch(0.623 0.214 259.815)',
			'blue-600': 'oklch(0.546 0.245 262.881)',
			'blue-700': 'oklch(0.488 0.243 264.376)',
			'blue-800': 'oklch(0.424 0.199 265.638)',
			'blue-900': 'oklch(0.379 0.146 265.522)',
			'blue-950': 'oklch(0.282 0.091 267.935)',
  			glassmorphism: 'rgba(16, 16, 18, 0.60)',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		boxShadow: {
  			'count-badge': '0px 0px 6px 2px rgba(219, 188, 159, 0.30)',
  			'groups-sidebar': '-30px 0px 60px 0px rgba(28, 28, 31, 0.50)',
  			bottom: ' 0px 2px rgba(0, 0, 0, 0.9)'
  		},
  		dropShadow: {
  			'text-blue': '2px 4px 15px rgba(37, 99, 235, 0.9)'
  		},
  		screens: {
  			xs: '400px',
  			grid1: '530px',
  			xx: '1670px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: 0
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: 0
  				}
  			},
  			spin: {
  				'0%, 100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'construction-1': {
  				'0%, 100%': {
  					transform: 'rotate(0deg)'
  				},
  				'25%': {
  					transform: 'rotate(3deg)'
  				},
  				'75%': {
  					transform: 'rotate(-3deg)'
  				}
  			},
  			'construction-2': {
  				'0%, 100%': {
  					transform: 'rotate(0deg)',
  					opacity: 0
  				},
  				'25%': {
  					transform: 'rotate(-3deg)',
  					opacity: 1
  				},
  				'75%': {
  					transform: 'rotate(3deg)',
  					opacity: 1
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			spin: 'spin 1s linear infinite',
  			'construction-1': 'construction-1 2s ease-in-out infinite',
  			'construction-2': 'construction-2 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [
	require("tailwindcss-animate"), 
	require('@tailwindcss/container-queries')
  ],
};