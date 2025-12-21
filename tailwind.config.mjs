/** @type {import('tailwindcss').Config} */
export default {
	// 这一行非常重要，告诉 Tailwind 扫描 src 目录下所有的文件
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [],
}