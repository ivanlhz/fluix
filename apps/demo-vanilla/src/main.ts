import { type FluixPosition, createToaster, createNotch, createMenu, fluix } from "@fluix-ui/vanilla";
import type { MenuVariant, NotchTrigger } from "@fluix-ui/core";
import "@fluix-ui/css";
import "./main.css";

/* ----------------------------- State ----------------------------- */

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
	const found = MENU_ITEMS.find((item) => item.hash === hash);
	return found?.id ?? MENU_ITEMS[0].id;
}

let theme: "light" | "dark" = "dark";
let position: FluixPosition = "top-right";
let layout: LayoutMode = "stack";
let menuVariant: MenuVariant = "tab";
let route: MenuRouteId = getMenuRouteFromHash(window.location.hash);

const toastTheme = () => (theme === "light" ? "dark" : "light");

/* ----------------------------- Toaster ----------------------------- */

const toaster = createToaster({
	position,
	layout,
	offset: 24,
	defaults: { theme: toastTheme() },
});

function updateToaster() {
	toaster.update({
		position,
		layout,
		offset: 24,
		defaults: { theme: toastTheme() },
	});
}

/* ----------------------------- DOM helpers ----------------------------- */

function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs?: Record<string, string>,
	children?: (Node | string)[],
): HTMLElementTagNameMap[K] {
	const e = document.createElement(tag);
	if (attrs) {
		for (const [k, v] of Object.entries(attrs)) {
			if (k === "className") e.className = v;
			else e.setAttribute(k, v);
		}
	}
	if (children) {
		for (const c of children) {
			if (typeof c === "string") e.appendChild(document.createTextNode(c));
			else e.appendChild(c);
		}
	}
	return e;
}

function pill(label: string, onClick: () => void, active = false): HTMLButtonElement {
	const btn = el(
		"button",
		{
			type: "button",
			className: `demo-pill${active ? " is-active" : ""}`,
		},
		[label],
	);
	btn.addEventListener("click", onClick);
	return btn;
}

/* ----------------------------- Build UI ----------------------------- */

const app = document.getElementById("app")!;

const shell = el("main", { className: `demo-shell theme-${theme}` });

/* ---- Sidebar ---- */
const sidebar = el("aside", { className: "demo-sidebar" });
sidebar.appendChild(el("div", { className: "demo-sidebar-brand" }, ["Fluix"]));
sidebar.appendChild(el("div", { className: "demo-sidebar-subtitle" }, ["Gooey Navigation"]));

const variantToggle = pill(menuVariant === "tab" ? "Tab" : "Pill", () => {
	menuVariant = menuVariant === "tab" ? "pill" : "tab";
	variantToggle.textContent = menuVariant === "tab" ? "Tab" : "Pill";
	menuInstance.update({ variant: menuVariant });
});
variantToggle.classList.add("demo-variant-toggle");
sidebar.appendChild(variantToggle);

const isMobile = window.matchMedia("(max-width: 760px)").matches;

const menuInstance = createMenu(sidebar, {
	orientation: isMobile ? "horizontal" : "vertical",
	variant: menuVariant,
	theme,
	activeId: null, // delayed via menuReady
	onActiveChange: (id) => {
		const nextRoute = MENU_ITEMS.find((item) => item.id === id);
		if (!nextRoute) return;
		route = nextRoute.id;
		window.history.replaceState(null, "", nextRoute.hash);
		menuInstance.setActive(id);
		updateRouteDisplay();
	},
	items: MENU_ITEMS.map((item) => ({ id: item.id, label: item.label })),
});

// Add className to the menu nav element
const menuNav = sidebar.querySelector("nav[data-fluix-menu]") as HTMLElement | null;
if (menuNav) menuNav.classList.add("demo-sidebar-menu");

shell.appendChild(sidebar);

/* ---- Content ---- */
const contentSection = el("section", { className: "demo-content" });
const contentSurface = el("div", { className: "demo-content-surface" });

// Route card
const routeCard = el("div", { className: "demo-card" });
const routeHeader = el("div", { className: "demo-header" });
const routeHeaderLeft = el("div");
const routeTitle = el("h1", { className: "demo-title" });
const routeSubtitle = el("p", { className: "demo-subtitle" });
routeHeaderLeft.appendChild(routeTitle);
routeHeaderLeft.appendChild(routeSubtitle);

// Theme toggle (matching React's label+checkbox pattern)
const themeToggle = el("label", { className: "theme-toggle" });
themeToggle.setAttribute("aria-label", "Cambiar tema oscuro y claro");
const themeCheckbox = el("input", { type: "checkbox" });
themeCheckbox.checked = theme === "dark";
const themeTrack = el("span", { className: "theme-toggle-track" }, [
	el("span", { className: "theme-toggle-thumb" }),
]);
const themeLabel = el("span", { className: "theme-toggle-label" }, [theme === "dark" ? "Dark" : "Light"]);
themeToggle.appendChild(themeCheckbox);
themeToggle.appendChild(themeTrack);
themeToggle.appendChild(themeLabel);

themeCheckbox.addEventListener("change", () => {
	theme = themeCheckbox.checked ? "dark" : "light";
	shell.className = `demo-shell theme-${theme} is-entered`;
	themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
	updateToaster();
	menuInstance.update({ theme });
});

routeHeader.appendChild(routeHeaderLeft);
routeHeader.appendChild(themeToggle);
routeCard.appendChild(routeHeader);
contentSurface.appendChild(routeCard);

function updateRouteDisplay() {
	const activeItem = MENU_ITEMS.find((item) => item.id === route) ?? MENU_ITEMS[0];
	routeTitle.textContent = activeItem.label;
	routeSubtitle.textContent = activeItem.subtitle;
}
updateRouteDisplay();

// Playground card
const playgroundCard = el("div", { className: "demo-card" });
const playgroundHeader = el("div", { className: "demo-header" });
const playgroundHeaderLeft = el("div");
playgroundHeaderLeft.appendChild(el("h2", { className: "demo-title" }, ["Fluix Playground"]));
playgroundHeaderLeft.appendChild(
	el("p", { className: "demo-subtitle" }, [
		"Proba posiciones, tipos de toast, layout stack/notch y tema visual.",
	]),
);
playgroundHeader.appendChild(playgroundHeaderLeft);
playgroundCard.appendChild(playgroundHeader);
contentSurface.appendChild(playgroundCard);

// Controls card
const controlsCard = el("div", { className: "demo-card" });

// Layout row
const layoutRow = el("div", { className: "demo-row" });
const layoutBtns: HTMLButtonElement[] = [];

for (const l of LAYOUTS) {
	const btn = pill(
		`Layout: ${l}`,
		() => {
			layout = l;
			updateToaster();
			for (const b of layoutBtns) {
				b.className = `demo-pill${b.dataset.layout === layout ? " is-active" : ""}`;
			}
		},
		l === layout,
	);
	btn.dataset.layout = l;
	layoutBtns.push(btn);
	layoutRow.appendChild(btn);
}
controlsCard.appendChild(layoutRow);

// Position row
const posRow = el("div", { className: "demo-row" });
const posBtns: HTMLButtonElement[] = [];

for (const p of POSITIONS) {
	const btn = pill(
		p,
		() => {
			position = p;
			updateToaster();
			for (const b of posBtns) {
				b.className = `demo-pill${b.dataset.position === position ? " is-active" : ""}`;
			}
		},
		p === position,
	);
	btn.dataset.position = p;
	posBtns.push(btn);
	posRow.appendChild(btn);
}
controlsCard.appendChild(posRow);

// Divider
controlsCard.appendChild(el("hr", { className: "demo-divider" }));

// Toast type buttons
const toastRow = el("div", { className: "demo-row" });

toastRow.appendChild(
	pill("Success", () => {
		fluix.success({ title: "Saved!", description: "Your changes have been saved." });
	}),
);

toastRow.appendChild(
	pill("Error", () => {
		fluix.error({ title: "Error", description: "Something went wrong." });
	}),
);

toastRow.appendChild(
	pill("Warning", () => {
		fluix.warning({ title: "Warning", description: "Please check this." });
	}),
);

toastRow.appendChild(
	pill("Info", () => {
		fluix.info({ title: "Info", description: "Just so you know." });
	}),
);

toastRow.appendChild(
	pill("Action", () => {
		fluix.action({
			title: "Action",
			description: "Confirm or dismiss.",
			button: { title: "Undo", onClick: () => fluix.info({ title: "Undone!" }) },
		});
	}),
);

toastRow.appendChild(
	pill("Icon", () => {
		fluix.success({
			title: "Custom Icon",
			description: "You can pass your own icon.",
			icon: "*",
		});
	}),
);

toastRow.appendChild(
	pill("Promise", () => {
		const bookingPromise = new Promise<{
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

		fluix.promise(bookingPromise, {
			loading: { title: "Confirming booking...", icon: "\u2708" },
			success: (data) => {
				const flightCard = el("div", { className: "flight-card" }, [
					el("div", { className: "flight-card-top" }, [
						el("span", { className: "flight-card-airline" }, [data.airline]),
						el("span", { className: "flight-card-pnr" }, [`PNR ${data.pnr}`]),
					]),
					el("div", { className: "flight-card-route" }, [
						el("span", { className: "flight-card-code" }, [data.from]),
						el("span", { className: "flight-card-arrow" }, ["\u2197"]),
						el("span", { className: "flight-card-code" }, [data.to]),
					]),
					el("div", { className: "flight-card-meta" }, [`Booking ID ${data.bookingId}`]),
				]);

				return {
					title: "Booking Confirmed",
					state: "success" as const,
					roundness: 20,
					description: flightCard,
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
	}),
);

controlsCard.appendChild(toastRow);

// Clear row
const clearRow = el("div", { className: "demo-row" });
clearRow.appendChild(pill("Clear", () => fluix.clear()));
controlsCard.appendChild(clearRow);

contentSurface.appendChild(controlsCard);

// --- Notch Demo ---
const notchCard = el("div", { className: "demo-card" });

const notchHeader = el("div", { className: "demo-header" });
const notchHeaderLeft = el("div");
notchHeaderLeft.appendChild(el("h2", { className: "demo-title" }, ["Notch Menu"]));
notchHeaderLeft.appendChild(
	el("p", { className: "demo-subtitle" }, [
		"Liquid expanding pill with gooey SVG morphing.",
	]),
);
notchHeader.appendChild(notchHeaderLeft);
notchCard.appendChild(notchHeader);

// Notch trigger row
const NOTCH_TRIGGERS: NotchTrigger[] = ["hover", "click", "manual"];
let notchTrigger: NotchTrigger = "hover";
let notchOpen = false;

const triggerRow = el("div", { className: "demo-row" });
const triggerBtns: HTMLButtonElement[] = [];

// Create nav content for the notch
function createNavContent(): HTMLElement {
	const nav = document.createElement("nav");
	nav.style.cssText = "display:flex;gap:1rem;padding:0.25rem 1.75rem;font-size:0.85rem;font-weight:500;";
	for (const label of ["Home", "About", "Work", "Contact"]) {
		const a = document.createElement("a");
		a.href = `#${label.toLowerCase()}`;
		a.style.cssText = "color:inherit;text-decoration:none;";
		a.textContent = label;
		nav.appendChild(a);
	}
	return nav;
}

// Create pill icon
function createPillIcon(): HTMLElement {
	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("width", "16");
	svg.setAttribute("height", "16");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("stroke", "currentColor");
	svg.setAttribute("stroke-width", "2");
	svg.setAttribute("stroke-linecap", "round");
	svg.setAttribute("stroke-linejoin", "round");
	for (const y of ["6", "12", "18"]) {
		const line = document.createElementNS(svgNS, "line");
		line.setAttribute("x1", "3");
		line.setAttribute("y1", y);
		line.setAttribute("x2", "21");
		line.setAttribute("y2", y);
		svg.appendChild(line);
	}
	const wrapper = document.createElement("div");
	wrapper.style.cssText = "display:flex;align-items:center;justify-content:center;";
	wrapper.appendChild(svg);
	return wrapper;
}

// Manual open/close row
const manualRow = el("div", { className: "demo-row" });
manualRow.style.marginTop = "1rem";
manualRow.style.display = "none";
const manualBtn = pill("Open Notch", () => {
	notchOpen = !notchOpen;
	notchInstance?.update({ open: notchOpen });
	manualBtn.textContent = notchOpen ? "Close Notch" : "Open Notch";
});
manualRow.appendChild(manualBtn);

let notchInstance = createNotch(shell, {
	trigger: notchTrigger,
	position: "top-center",
	dotSize: 36,
	roundness: 20,
	theme: toastTheme(),
	pill: createPillIcon(),
	content: createNavContent(),
	onOpenChange: (v) => {
		if (notchTrigger === "manual") {
			notchOpen = v;
			manualBtn.textContent = v ? "Close Notch" : "Open Notch";
		}
	},
});

function recreateNotch() {
	notchInstance.destroy();
	notchOpen = false;
	manualBtn.textContent = "Open Notch";
	notchInstance = createNotch(shell, {
		trigger: notchTrigger,
		position: "top-center",
		dotSize: 36,
		roundness: 20,
		theme: toastTheme(),
		pill: createPillIcon(),
		content: createNavContent(),
		open: notchTrigger === "manual" ? notchOpen : undefined,
		onOpenChange: (v) => {
			if (notchTrigger === "manual") {
				notchOpen = v;
				manualBtn.textContent = v ? "Close Notch" : "Open Notch";
			}
		},
	});
}

for (const t of NOTCH_TRIGGERS) {
	const btn = pill(
		`Trigger: ${t}`,
		() => {
			notchTrigger = t;
			manualRow.style.display = t === "manual" ? "" : "none";
			for (const b of triggerBtns) {
				b.className = `demo-pill${b.dataset.trigger === notchTrigger ? " is-active" : ""}`;
			}
			recreateNotch();
		},
		t === notchTrigger,
	);
	btn.dataset.trigger = t;
	triggerBtns.push(btn);
	triggerRow.appendChild(btn);
}
notchCard.appendChild(triggerRow);
notchCard.appendChild(manualRow);

contentSurface.appendChild(notchCard);

contentSection.appendChild(contentSurface);
shell.appendChild(contentSection);

app.appendChild(shell);

// --- Entrance animation + delayed menu active ---
requestAnimationFrame(() => {
	shell.classList.add("is-entered");
});

setTimeout(() => {
	menuInstance.setActive(route);
}, 700);

// --- Hash change listener ---
window.addEventListener("hashchange", () => {
	route = getMenuRouteFromHash(window.location.hash);
	menuInstance.setActive(route);
	updateRouteDisplay();
});

// --- Mobile media query ---
const mql = window.matchMedia("(max-width: 760px)");
mql.addEventListener("change", (e) => {
	menuInstance.update({ orientation: e.matches ? "horizontal" : "vertical" });
});
