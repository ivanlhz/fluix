import { type FluixPosition, createToaster, createNotch, fluix } from "@fluix-ui/vanilla";
import type { NotchTrigger } from "@fluix-ui/core";
import "@fluix-ui/css";
import "./main.css";

console.log(
	"[demo-vanilla] script loaded, createToaster:",
	typeof createToaster,
	"fluix:",
	typeof fluix,
);

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

let theme: "light" | "dark" = "dark";
let position: FluixPosition = "top-right";
let layout: LayoutMode = "stack";

const toastTheme = () => (theme === "light" ? "dark" : "light");

/* ----------------------------- Toaster ----------------------------- */

console.log("[demo-vanilla] creating toaster...");
const toaster = createToaster({
	position,
	layout,
	offset: 24,
	defaults: { theme: toastTheme() },
});
console.log("[demo-vanilla] toaster created:", toaster);

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
const card = el("div", { className: "demo-card" });

// Header
const header = el("div", { className: "demo-header" });
const headerLeft = el("div");
headerLeft.appendChild(el("h1", { className: "demo-title" }, ["Fluix Playground (Vanilla)"]));
headerLeft.appendChild(
	el("p", { className: "demo-subtitle" }, [
		"Test positions, toast types, stack/notch layout, and theme toggle.",
	]),
);

const themeBtn = pill(theme === "dark" ? "Dark" : "Light", () => {
	theme = theme === "dark" ? "light" : "dark";
	shell.className = `demo-shell theme-${theme}`;
	themeBtn.textContent = theme === "dark" ? "Dark" : "Light";
	updateToaster();
});

header.appendChild(headerLeft);
header.appendChild(themeBtn);
card.appendChild(header);

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
card.appendChild(layoutRow);

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
card.appendChild(posRow);

// Divider
card.appendChild(el("hr", { className: "demo-divider" }));

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
				// Build flight card with plain DOM
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

card.appendChild(toastRow);

// Clear row
const clearRow = el("div", { className: "demo-row" });
clearRow.appendChild(pill("Clear", () => fluix.clear()));
card.appendChild(clearRow);

shell.appendChild(card);

// --- Notch Demo ---
const notchCard = el("div", { className: "demo-card" });
notchCard.style.marginTop = "2rem";

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
	// Wrap in div since createNotch expects HTMLElement
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

shell.appendChild(notchCard);

console.log("[demo-vanilla] appending shell to #app, app=", app);
app.appendChild(shell);
console.log("[demo-vanilla] DOM mounted, shell children:", shell.childElementCount);
