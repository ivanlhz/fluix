<script lang="ts">
import { Notch } from "@fluix-ui/svelte";

let theme = $state<"light" | "dark">("dark");
const notchTheme = $derived<"light" | "dark">(theme === "light" ? "dark" : "light");
</script>

<main class="showcase theme-{theme}" onclick={() => (theme = theme === "dark" ? "light" : "dark")}>
	<Notch
		trigger="hover"
		position="top-center"
		dotSize={36}
		roundness={20}
		theme={notchTheme}
	>
		{#snippet pill()}
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="3" y1="6" x2="21" y2="6" />
				<line x1="3" y1="12" x2="21" y2="12" />
				<line x1="3" y1="18" x2="21" y2="18" />
			</svg>
		{/snippet}
		{#snippet content()}
			<nav style="display:flex;gap:0.4rem;padding:0;align-items:center;">
				<!-- Home -->
				<a href="#home" style="color:inherit;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:0.5rem;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
						<polyline points="9 22 9 12 15 12 15 22"/>
					</svg>
				</a>
				<!-- Search -->
				<a href="#search" style="color:inherit;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:0.5rem;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="11" cy="11" r="8"/>
						<line x1="21" y1="21" x2="16.65" y2="16.65"/>
					</svg>
				</a>
				<!-- User -->
				<a href="#profile" style="color:inherit;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:0.5rem;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
				</a>
				<!-- Settings -->
				<a href="#settings" style="color:inherit;text-decoration:none;display:flex;align-items:center;justify-content:center;padding:0.5rem;">
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="3"/>
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
					</svg>
				</a>
			</nav>
		{/snippet}
	</Notch>

	<p class="showcase-hint">Click anywhere to toggle theme</p>
</main>

<style>
	.showcase {
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background-color 300ms ease;
	}
	.showcase.theme-dark {
		background: oklch(0.13 0 0);
	}
	.showcase.theme-light {
		background: oklch(0.96 0 0);
	}
	.showcase-hint {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 0.75rem;
		opacity: 0.3;
		pointer-events: none;
		color: inherit;
	}
	.showcase.theme-dark .showcase-hint {
		color: #fff;
	}
	.showcase.theme-light .showcase-hint {
		color: #000;
	}
</style>
