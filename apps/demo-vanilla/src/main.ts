import { type FluixPosition, createToaster, fluix } from "@fluix/vanilla";
import "@fluix/css";
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
console.log("[demo-vanilla] appending shell to #app, app=", app);
app.appendChild(shell);
console.log("[demo-vanilla] DOM mounted, shell children:", shell.childElementCount);
