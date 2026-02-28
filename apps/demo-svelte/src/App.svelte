<script lang="ts">
import { type FluixPosition, type NotchTrigger, type MenuVariant, fluix, Menu, MenuItem, Notch, Toaster } from "@fluix-ui/svelte";
import type { Snippet } from "svelte";

const POSITIONS: FluixPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

const LAYOUTS = ["stack", "notch"] as const;
type LayoutMode = (typeof LAYOUTS)[number];

const MENU_ITEMS = [
	{ id: "profile", label: "Perfil", hash: "#profile", subtitle: "Resumen de usuario y actividad." },
	{ id: "courses", label: "Mis cursos", hash: "#courses", subtitle: "Cursos activos, completados y progreso." },
	{ id: "calendar", label: "Calendario", hash: "#calendar", subtitle: "Eventos, clases y entregas de la semana." },
	{ id: "messages", label: "Mensajes", hash: "#messages", subtitle: "Notificaciones y conversaciones recientes." },
] as const;

type MenuRouteId = (typeof MENU_ITEMS)[number]["id"];

function getMenuRouteFromHash(hash: string): MenuRouteId {
	const route = MENU_ITEMS.find((item) => item.hash === hash);
	return route?.id ?? MENU_ITEMS[0].id;
}

let theme = $state<"light" | "dark">("dark");
let position = $state<FluixPosition>("top-right");
let layout = $state<LayoutMode>("stack");
let menuVariant = $state<MenuVariant>("tab");
let route = $state<MenuRouteId>(getMenuRouteFromHash(window.location.hash));
let layoutEntered = $state(false);
let menuReady = $state(false);
let isMobile = $state(window.matchMedia("(max-width: 760px)").matches);

const toastTheme = $derived<"light" | "dark">(theme === "light" ? "dark" : "light");
const toasterConfig = $derived({
	position,
	layout,
	offset: 24,
	defaults: { theme: toastTheme },
});

const activeRoute = $derived(MENU_ITEMS.find((item) => item.id === route) ?? MENU_ITEMS[0]);

$effect(() => {
	const handleHashChange = () => {
		route = getMenuRouteFromHash(window.location.hash);
	};
	window.addEventListener("hashchange", handleHashChange);
	handleHashChange();

	const raf = requestAnimationFrame(() => { layoutEntered = true; });
	const menuTimer = setTimeout(() => { menuReady = true; }, 700);

	const mql = window.matchMedia("(max-width: 760px)");
	const onMqlChange = (e: MediaQueryListEvent) => { isMobile = e.matches; };
	mql.addEventListener("change", onMqlChange);

	return () => {
		cancelAnimationFrame(raf);
		clearTimeout(menuTimer);
		window.removeEventListener("hashchange", handleHashChange);
		mql.removeEventListener("change", onMqlChange);
	};
});

const handleRouteChange = (id: string) => {
	const nextRoute = MENU_ITEMS.find((item) => item.id === id);
	if (!nextRoute) return;
	route = nextRoute.id;
	window.history.replaceState(null, "", nextRoute.hash);
};

const createBookingPromise = () =>
	new Promise<{
		airline: string;
		from: string;
		to: string;
		pnr: string;
		bookingId: string;
	}>((resolve) => {
		setTimeout(() => {
			resolve({
				airline: "United",
				from: "DEL",
				to: "SFO",
				pnr: "EC2QW4",
				bookingId: "UA-920114",
			});
		}, 1800);
	});

// Flight data holder for the snippet
let flightData = $state<{
	airline: string;
	from: string;
	to: string;
	pnr: string;
	bookingId: string;
} | null>(null);

// Notch demo state
const NOTCH_TRIGGERS: NotchTrigger[] = ["hover", "click", "manual"];
let notchTrigger = $state<NotchTrigger>("hover");
let notchOpen = $state(false);

const showPromise = () =>
	fluix.promise(createBookingPromise(), {
		loading: { title: "Confirming booking...", icon: "✈" },
		success: (data) => {
			flightData = data;
			return {
				title: "Booking Confirmed",
				state: "success",
				roundness: 20,
				description: flightCardSnippet as unknown as Snippet,
				button: {
					title: "View Details",
					onClick: () =>
						fluix.info({
							title: "Trip details opened",
							description: `Reservation ${data.bookingId} ready.`,
						}),
				},
				styles: {
					button: "flight-card-button",
				},
			};
		},
		error: () => ({
			title: "Booking failed",
			description: "We could not complete your reservation. Try again in a few minutes.",
		}),
	});
</script>

{#snippet flightCardSnippet()}
	{#if flightData}
		<div class="flight-card">
			<div class="flight-card-top">
				<span class="flight-card-airline">{flightData.airline}</span>
				<span class="flight-card-pnr">PNR {flightData.pnr}</span>
			</div>
			<div class="flight-card-route">
				<span class="flight-card-code">{flightData.from}</span>
				<span class="flight-card-arrow">↗</span>
				<span class="flight-card-code">{flightData.to}</span>
			</div>
			<div class="flight-card-meta">Booking ID {flightData.bookingId}</div>
		</div>
	{/if}
{/snippet}

<main class="demo-shell theme-{theme} {layoutEntered ? 'is-entered' : ''}">
	<aside class="demo-sidebar">
		<div class="demo-sidebar-brand">Fluix</div>
		<div class="demo-sidebar-subtitle">Gooey Navigation</div>

		<button
			type="button"
			class="demo-pill demo-variant-toggle"
			onclick={() => (menuVariant = menuVariant === "tab" ? "pill" : "tab")}
		>
			{menuVariant === "tab" ? "Tab" : "Pill"}
		</button>

		<Menu
			orientation={isMobile ? "horizontal" : "vertical"}
			variant={menuVariant}
			{theme}
			activeId={menuReady ? route : null}
			onActiveChange={handleRouteChange}
			className="demo-sidebar-menu"
		>
			{#each MENU_ITEMS as item (item.id)}
				<MenuItem id={item.id}>
					{item.label}
				</MenuItem>
			{/each}
		</Menu>
	</aside>

	<section class="demo-content">
		<div class="demo-content-surface">
			<div class="demo-card">
				<div class="demo-header">
					<div>
						<h1 class="demo-title">{activeRoute.label}</h1>
						<p class="demo-subtitle">{activeRoute.subtitle}</p>
					</div>
					<label class="theme-toggle" aria-label="Cambiar tema oscuro y claro">
						<input
							type="checkbox"
							checked={theme === "dark"}
							onchange={(e) => { theme = (e.target as HTMLInputElement).checked ? "dark" : "light"; }}
						/>
						<span class="theme-toggle-track">
							<span class="theme-toggle-thumb"></span>
						</span>
						<span class="theme-toggle-label">{theme === "dark" ? "Dark" : "Light"}</span>
					</label>
				</div>
			</div>

			<div class="demo-card">
				<div class="demo-header">
					<div>
						<h2 class="demo-title">Fluix Playground</h2>
						<p class="demo-subtitle">
							Proba posiciones, tipos de toast, layout stack/notch y tema visual.
						</p>
					</div>
				</div>
			</div>

			<div class="demo-card">
				<div class="demo-row">
					{#each LAYOUTS as item}
						<button
							type="button"
							class="demo-pill"
							class:is-active={layout === item}
							onclick={() => (layout = item)}
						>
							Layout: {item}
						</button>
					{/each}
				</div>

				<div class="demo-row">
					{#each POSITIONS as item}
						<button
							type="button"
							class="demo-pill"
							class:is-active={position === item}
							onclick={() => (position = item)}
						>
							{item}
						</button>
					{/each}
				</div>

				<hr class="demo-divider" />

				<div class="demo-row">
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.success({ title: "Saved!", description: "Your changes have been saved." })}
					>
						Success
					</button>
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.error({ title: "Error", description: "Something went wrong." })}
					>
						Error
					</button>
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.warning({ title: "Warning", description: "Please check this." })}
					>
						Warning
					</button>
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.info({ title: "Info", description: "Just so you know." })}
					>
						Info
					</button>
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.action({
							title: "Action",
							description: "Confirm or dismiss.",
							button: { title: "Undo", onClick: () => fluix.info({ title: "Undone!" }) },
						})}
					>
						Action
					</button>
					<button
						type="button"
						class="demo-pill"
						onclick={() => fluix.success({
							title: "Custom Icon",
							description: "You can pass your own icon.",
							icon: "*",
						})}
					>
						Icon
					</button>
					<button type="button" class="demo-pill" onclick={showPromise}>
						Promise
					</button>
				</div>

				<div class="demo-row">
					<button type="button" class="demo-pill" onclick={() => fluix.clear()}>
						Clear
					</button>
				</div>
			</div>

			<div class="demo-card">
				<div class="demo-header">
					<div>
						<h2 class="demo-title">Notch Menu</h2>
						<p class="demo-subtitle">
							Liquid expanding pill with gooey SVG morphing.
						</p>
					</div>
				</div>

				<div class="demo-row">
					{#each NOTCH_TRIGGERS as t}
						<button
							type="button"
							class="demo-pill"
							class:is-active={notchTrigger === t}
							onclick={() => { notchTrigger = t; notchOpen = false; }}
						>
							Trigger: {t}
						</button>
					{/each}
				</div>

				{#if notchTrigger === "manual"}
					<div class="demo-row" style="margin-top:1rem;">
						<button
							type="button"
							class="demo-pill"
							onclick={() => (notchOpen = !notchOpen)}
						>
							{notchOpen ? "Close" : "Open"} Notch
						</button>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<Toaster config={toasterConfig} />

	{#key notchTrigger}
		<Notch
			trigger={notchTrigger}
			position="top-center"
			dotSize={36}
			roundness={20}
			theme={toastTheme}
			open={notchTrigger === "manual" ? notchOpen : undefined}
			onOpenChange={notchTrigger === "manual" ? (v) => (notchOpen = v) : undefined}
		>
			{#snippet pill()}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			{/snippet}
			{#snippet content()}
				<nav style="display:flex;gap:1rem;padding:0.25rem 1.75rem;font-size:0.85rem;font-weight:500;">
					<a href="#home" style="color:inherit;text-decoration:none;">Home</a>
					<a href="#about" style="color:inherit;text-decoration:none;">About</a>
					<a href="#work" style="color:inherit;text-decoration:none;">Work</a>
					<a href="#contact" style="color:inherit;text-decoration:none;">Contact</a>
				</nav>
			{/snippet}
		</Notch>
	{/key}
</main>
