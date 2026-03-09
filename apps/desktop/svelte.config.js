import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html' // may differ from strict PRERENDER, but fallback is safe for SPA
		})
	}
};

export default config;
