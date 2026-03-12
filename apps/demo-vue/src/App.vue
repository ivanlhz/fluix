<script setup lang="ts">
import type { MenuVariant, NotchTrigger, TooltipPosition } from "@fluix-ui/core";
import {
	type FluixPosition,
	MenuItem,
	MenuRoot,
	Notch,
	Toaster,
	TooltipContent,
	TooltipRoot,
	TooltipTrigger,
	fluix,
} from "@fluix-ui/vue";
import { computed, h, onMounted, onUnmounted, ref } from "vue";

const TOOLTIP_POSITIONS: TooltipPosition[] = ["top", "bottom", "left", "right"];

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

const NOTCH_TRIGGERS: NotchTrigger[] = ["hover", "click", "manual"];

const MENU_ITEMS = [
	{ id: "profile", label: "Perfil", hash: "#profile", subtitle: "Resumen de usuario y actividad." },
	{
		id: "courses",
		label: "Mis cursos",
		hash: "#courses",
		subtitle: "Cursos activos, completados y progreso.",
	},
	{
		id: "calendar",
		label: "Calendario",
		hash: "#calendar",
		subtitle: "Eventos, clases y entregas de la semana.",
	},
	{
		id: "messages",
		label: "Mensajes",
		hash: "#messages",
		subtitle: "Notificaciones y conversaciones recientes.",
	},
] as const;

type MenuRouteId = (typeof MENU_ITEMS)[number]["id"];

function getMenuRouteFromHash(hash: string): MenuRouteId {
	const route = MENU_ITEMS.find((item) => item.hash === hash);
	return route?.id ?? MENU_ITEMS[0].id;
}

const theme = ref<"light" | "dark">("dark");
const position = ref<FluixPosition>("top-right");
const layout = ref<LayoutMode>("stack");
const menuVariant = ref<MenuVariant>("tab");
const notchTrigger = ref<NotchTrigger>("hover");
const notchOpen = ref(false);
const tooltipPosition = ref<TooltipPosition>("top");
const route = ref<MenuRouteId>(getMenuRouteFromHash(window.location.hash));
const layoutEntered = ref(false);
const menuReady = ref(false);
const isMobile = ref(window.matchMedia("(max-width: 760px)").matches);

const toastTheme = computed<"light" | "dark">(() => (theme.value === "light" ? "dark" : "light"));

const toasterConfig = computed(() => ({
	position: position.value,
	layout: layout.value,
	offset: 24,
	defaults: { theme: toastTheme.value },
}));

const activeRoute = computed(
	() => MENU_ITEMS.find((item) => item.id === route.value) ?? MENU_ITEMS[0],
);

let mql: MediaQueryList;
let handleHashChange: () => void;

onMounted(() => {
	handleHashChange = () => {
		route.value = getMenuRouteFromHash(window.location.hash);
	};
	window.addEventListener("hashchange", handleHashChange);
	handleHashChange();

	requestAnimationFrame(() => {
		layoutEntered.value = true;
	});
	setTimeout(() => {
		menuReady.value = true;
	}, 700);

	mql = window.matchMedia("(max-width: 760px)");
	const onMqlChange = (e: MediaQueryListEvent) => {
		isMobile.value = e.matches;
	};
	mql.addEventListener("change", onMqlChange);
	onUnmounted(() => {
		window.removeEventListener("hashchange", handleHashChange);
		mql.removeEventListener("change", onMqlChange);
	});
});

const handleRouteChange = (id: string) => {
	const nextRoute = MENU_ITEMS.find((item) => item.id === id);
	if (!nextRoute) return;
	route.value = nextRoute.id;
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

const showSuccess = () =>
	fluix.success({ title: "Saved!", description: "Your changes have been saved." });

const showError = () => fluix.error({ title: "Error", description: "Something went wrong." });

const showWarning = () => fluix.warning({ title: "Warning", description: "Please check this." });

const showInfo = () => fluix.info({ title: "Info", description: "Just so you know." });

const showAction = () =>
	fluix.action({
		title: "Action",
		description: "Confirm or dismiss.",
		button: { title: "Undo", onClick: () => fluix.info({ title: "Undone!" }) },
	});

const showIcon = () =>
	fluix.success({
		title: "Custom Icon",
		description: "You can pass your own icon.",
		icon: "*",
	});

const showPromise = () =>
	fluix.promise(createBookingPromise(), {
		loading: { title: "Confirming booking...", icon: "✈" },
		success: (data) => ({
			title: "Booking Confirmed",
			state: "success",
			roundness: 20,
			description: h("div", { class: "flight-card" }, [
				h("div", { class: "flight-card-top" }, [
					h("span", { class: "flight-card-airline" }, data.airline),
					h("span", { class: "flight-card-pnr" }, `PNR ${data.pnr}`),
				]),
				h("div", { class: "flight-card-route" }, [
					h("span", { class: "flight-card-code" }, data.from),
					h("span", { class: "flight-card-arrow" }, "↗"),
					h("span", { class: "flight-card-code" }, data.to),
				]),
				h("div", { class: "flight-card-meta" }, `Booking ID ${data.bookingId}`),
			]),
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
		}),
		error: () => ({
			title: "Booking failed",
			description: "We could not complete your reservation. Try again in a few minutes.",
		}),
	});
</script>

<template>
	<main :class="`demo-shell theme-${theme} ${layoutEntered ? 'is-entered' : ''}`">
		<aside class="demo-sidebar">
			<div class="demo-sidebar-brand">Fluix</div>
			<div class="demo-sidebar-subtitle">Gooey Navigation</div>

			<button
				type="button"
				class="demo-pill demo-variant-toggle"
				@click="menuVariant = menuVariant === 'tab' ? 'pill' : 'tab'"
			>
				{{ menuVariant === 'tab' ? 'Tab' : 'Pill' }}
			</button>

			<MenuRoot
				:orientation="isMobile ? 'horizontal' : 'vertical'"
				:variant="menuVariant"
				:theme="theme"
				:active-id="menuReady ? route : null"
				:on-active-change="handleRouteChange"
				class-name="demo-sidebar-menu"
			>
				<MenuItem
					v-for="item in MENU_ITEMS"
					:key="item.id"
					:id="item.id"
				>
					{{ item.label }}
				</MenuItem>
			</MenuRoot>
		</aside>

		<section class="demo-content">
			<div class="demo-content-surface">
				<div class="demo-card">
					<div class="demo-header">
						<div>
							<h1 class="demo-title">{{ activeRoute.label }}</h1>
							<p class="demo-subtitle">{{ activeRoute.subtitle }}</p>
						</div>
						<label class="theme-toggle" aria-label="Cambiar tema oscuro y claro">
							<input
								type="checkbox"
								:checked="theme === 'dark'"
								@change="(e: Event) => theme = (e.target as HTMLInputElement).checked ? 'dark' : 'light'"
							/>
							<span class="theme-toggle-track">
								<span class="theme-toggle-thumb" />
							</span>
							<span class="theme-toggle-label">{{ theme === "dark" ? "Dark" : "Light" }}</span>
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
						<button
							v-for="item in LAYOUTS"
							:key="item"
							type="button"
							:class="['demo-pill', { 'is-active': layout === item }]"
							@click="layout = item"
						>
							Layout: {{ item }}
						</button>
					</div>

					<div class="demo-row">
						<button
							v-for="item in POSITIONS"
							:key="item"
							type="button"
							:class="['demo-pill', { 'is-active': position === item }]"
							@click="position = item"
						>
							{{ item }}
						</button>
					</div>

					<hr class="demo-divider" />

					<div class="demo-row">
						<button type="button" class="demo-pill" @click="showSuccess">Success</button>
						<button type="button" class="demo-pill" @click="showError">Error</button>
						<button type="button" class="demo-pill" @click="showWarning">Warning</button>
						<button type="button" class="demo-pill" @click="showInfo">Info</button>
						<button type="button" class="demo-pill" @click="showAction">Action</button>
						<button type="button" class="demo-pill" @click="showIcon">Icon</button>
						<button type="button" class="demo-pill" @click="showPromise">Promise</button>
					</div>

					<div class="demo-row">
						<button type="button" class="demo-pill" @click="fluix.clear()">Clear</button>
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
						<button
							v-for="t in NOTCH_TRIGGERS"
							:key="t"
							type="button"
							:class="['demo-pill', { 'is-active': notchTrigger === t }]"
							@click="notchTrigger = t; notchOpen = false;"
						>
							Trigger: {{ t }}
						</button>
					</div>

				<div v-if="notchTrigger === 'manual'" class="demo-row" style="margin-top:1rem;">
					<button
						type="button"
						class="demo-pill"
						@click="notchOpen = !notchOpen"
					>
						{{ notchOpen ? 'Close' : 'Open' }} Notch
					</button>
				</div>
			</div>

			<div class="demo-card">
				<div class="demo-header">
					<div>
						<h2 class="demo-title">Tooltip</h2>
						<p class="demo-subtitle">
							Spring entrance with gooey morph between grouped triggers.
						</p>
					</div>
				</div>

				<div class="demo-row">
					<button
						v-for="pos in TOOLTIP_POSITIONS"
						:key="pos"
						type="button"
						:class="['demo-pill', { 'is-active': tooltipPosition === pos }]"
						@click="tooltipPosition = pos"
					>
						{{ pos }}
					</button>
				</div>

				<hr class="demo-divider" />

				<p class="demo-label">Individual</p>
				<div class="demo-row">
					<TooltipRoot :position="tooltipPosition">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Save</button>
						</TooltipTrigger>
						<TooltipContent>Save your progress</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Delete</button>
						</TooltipTrigger>
						<TooltipContent>Remove this item permanently</TooltipContent>
					</TooltipRoot>
				</div>

				<hr class="demo-divider" />

				<p class="demo-label">Grouped (gooey morph)</p>
				<div class="demo-tooltip-group demo-row">
					<TooltipRoot :position="tooltipPosition" group="formatting">
						<TooltipTrigger>
							<button type="button" class="demo-pill demo-pill-icon"><strong>B</strong></button>
						</TooltipTrigger>
						<TooltipContent>Bold</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition" group="formatting">
						<TooltipTrigger>
							<button type="button" class="demo-pill demo-pill-icon"><em>I</em></button>
						</TooltipTrigger>
						<TooltipContent>Italic</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition" group="formatting">
						<TooltipTrigger>
							<button type="button" class="demo-pill demo-pill-icon"><u>U</u></button>
						</TooltipTrigger>
						<TooltipContent>Underline</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition" group="formatting">
						<TooltipTrigger>
							<button type="button" class="demo-pill demo-pill-icon"><s>S</s></button>
						</TooltipTrigger>
						<TooltipContent>Strikethrough</TooltipContent>
					</TooltipRoot>
				</div>

				<hr class="demo-divider" />

				<p class="demo-label">Custom colors</p>
				<div class="demo-row">
					<TooltipRoot :position="tooltipPosition" bg-color="oklch(0.55 0.25 270)" text-color="#fff">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Purple</button>
						</TooltipTrigger>
						<TooltipContent>Violet vibes</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition" bg-color="oklch(0.65 0.2 145)" text-color="#fff">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Green</button>
						</TooltipTrigger>
						<TooltipContent>Earthy tones</TooltipContent>
					</TooltipRoot>
					<TooltipRoot :position="tooltipPosition" bg-color="oklch(0.7 0.18 50)" text-color="#1a1a1a">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Amber</button>
						</TooltipTrigger>
						<TooltipContent>Warm warning</TooltipContent>
					</TooltipRoot>
				</div>

				<hr class="demo-divider" />

				<p class="demo-label">Rich content</p>
				<div class="demo-row">
					<TooltipRoot :position="tooltipPosition">
						<TooltipTrigger>
							<button type="button" class="demo-pill">Keyboard shortcut</button>
						</TooltipTrigger>
						<TooltipContent>
							Copy <kbd class="demo-kbd">Ctrl</kbd> + <kbd class="demo-kbd">C</kbd>
						</TooltipContent>
					</TooltipRoot>
				</div>
			</div>
		</div>
	</section>

		<Toaster :config="toasterConfig" />

		<Notch
			:key="notchTrigger"
			:trigger="notchTrigger"
			position="top-center"
			:dot-size="36"
			:roundness="20"
			:theme="toastTheme"
			:open="notchTrigger === 'manual' ? notchOpen : undefined"
			:on-open-change="notchTrigger === 'manual' ? (v: boolean) => (notchOpen = v) : undefined"
		>
			<template #pill>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="3" y1="6" x2="21" y2="6" />
					<line x1="3" y1="12" x2="21" y2="12" />
					<line x1="3" y1="18" x2="21" y2="18" />
				</svg>
			</template>
			<template #content>
				<nav style="display:flex;gap:1rem;padding:0.25rem 1.75rem;font-size:0.85rem;font-weight:500;">
					<a href="#home" style="color:inherit;text-decoration:none;">Home</a>
					<a href="#about" style="color:inherit;text-decoration:none;">About</a>
					<a href="#work" style="color:inherit;text-decoration:none;">Work</a>
					<a href="#contact" style="color:inherit;text-decoration:none;">Contact</a>
				</nav>
			</template>
		</Notch>
	</main>
</template>
