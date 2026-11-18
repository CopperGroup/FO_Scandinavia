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
		// xs–3xl read CSS variables. The fallbacks are Tailwind's own sizes, used by
		// the storefront. The admin sets the variables on its <html> (app/globals.css,
		// "Admin proportions"): 14px body, each step 1.2 times the last, lines on a 4px grid.
		'xs': [
			'var(--text-xs, 0.75rem)', // 12px
			{ lineHeight: 'var(--leading-xs, 1rem)' } // 16px
		],
		'sm': [
			'var(--text-sm, 0.875rem)', // 14px
			{ lineHeight: 'var(--leading-sm, 1.25rem)' } // 20px
		],
		'base': [
			'var(--text-base, 1rem)', // 16px
			{ lineHeight: 'var(--leading-base, 1.5rem)' } // 24px
		],
		'lg': [
			'var(--text-lg, 1.125rem)', // 18px
			{ lineHeight: 'var(--leading-lg, 1.75rem)' } // 28px
		],
		'xl': [
			'var(--text-xl, 1.25rem)', // 20px
			{ lineHeight: 'var(--leading-xl, 1.75rem)' } // 28px
		],
		'2xl': [
			'var(--text-2xl, 1.5rem)', // 24px
			{ lineHeight: 'var(--leading-2xl, 2rem)' } // 32px
		],
		'3xl': [
			'var(--text-3xl, 1.875rem)', // 30px
			{ lineHeight: 'var(--leading-3xl, 2.25rem)' } // 36px
		],
		'4xl': [
			'2.25rem', // 36px
			{ lineHeight: '2.5rem' } // 40px
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
  	// Same idea as fontSize: the fallbacks are Tailwind's defaults (storefront),
  	// the admin pins 4 / 6 / 8 / 12 / 16px through variables.
  	borderRadius: {
  		none: '0px',
  		sm: 'var(--radius-sm, 0.125rem)',
  		DEFAULT: 'var(--radius-default, 0.25rem)',
  		md: 'var(--radius-md, 0.375rem)',
  		lg: 'var(--radius-lg, 0.5rem)',
  		xl: 'var(--radius-xl, 0.75rem)',
  		'2xl': 'var(--radius-2xl, 1rem)',
  		'3xl': 'var(--radius-3xl, 1.5rem)',
  		full: '9999px'
  	},
  	extend: {
  		// Heights of the admin controls (h-control, min-w-control, …): 36 and 28px,
  		// 44 and 36px on a touch screen. Set in app/globals.css, "Admin proportions".
  		spacing: {
  			control: 'var(--control, 2.5rem)',
  			'control-sm': 'var(--control-sm, 2rem)'
  		},
  		fontFamily: {
  			sans: ['var(--font-text)', 'system-ui', 'sans-serif'],
  			display: ['var(--font-display)', 'var(--font-text)', 'system-ui', 'sans-serif']
  		},
  		colors: {
  			'theme-3': 'rgb(254, 204, 2)',
  			brand: {
  				DEFAULT: '#006AA7',
  				dark: '#005a8e',
  				deep: '#004d7a',
  				tint: '#e8f2f9',
  				// Dark surface of the header and footer.
  				navy: '#0b2e4a',
  				// Sale prices, discount tags and errors (Falu red).
  				sale: '#b23a2e',
  				'sale-tint': '#fbeeec',
  				// Positive states: in stock, paid, free delivery reached.
  				ok: '#1f7a55',
  				'ok-tint': '#e8f4ee',
  				sun: '#FECC02',
  				'sun-dark': '#e6b800',
  				tile: '#f3f4f2',
  				ink: '#10222e',
  				mist: '#f2f5f8',
  				line: '#dce3ea',
  				muted: '#586874'
  			},
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
  			'admin-progress': {
  				'0%': { transform: 'translateX(-100%)' },
  				'100%': { transform: 'translateX(300%)' }
  			},
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
  			'sheet-up': {
  				from: { transform: 'translateY(8px)', opacity: 0 },
  				to: { transform: 'translateY(0)', opacity: 1 }
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
  			'sheet-up': 'sheet-up 0.16s ease-out',
  			spin: 'spin 1s linear infinite',
  			'construction-1': 'construction-1 2s ease-in-out infinite',
  			'construction-2': 'construction-2 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [
	require("tailwindcss-animate"), 
	require('@tailwindcss/container-queries'),
	// `short:` targets laptop-height windows, where a screen must fit without scrolling.
	function ({ addVariant }: { addVariant: (name: string, definition: string) => void }) {
		addVariant('short', '@media (max-height: 760px)')
	}
  ],
};