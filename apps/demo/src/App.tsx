import type { MenuVariant, NotchTrigger, TooltipPosition } from "@fluix-ui/core";
import { type FluixPosition, Menu, Notch, Toaster, Tooltip, fluix } from "@fluix-ui/react";
import { useEffect, useMemo, useReducer, useSyncExternalStore } from "react";

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

const TOOLTIP_POSITIONS: TooltipPosition[] = ["top", "bottom", "left", "right"];

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

const MOBILE_QUERY = "(max-width: 760px)";
const mqlSubscribe = (cb: () => void) => {
	const mql = window.matchMedia(MOBILE_QUERY);
	mql.addEventListener("change", cb);
	return () => mql.removeEventListener("change", cb);
};
const mqlSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
const mqlServerSnapshot = () => false;

/* ----------------------------- Reducer ----------------------------- */

interface DemoState {
	theme: "light" | "dark";
	position: FluixPosition;
	layout: LayoutMode;
	menuVariant: MenuVariant;
	notchTrigger: NotchTrigger;
	notchOpen: boolean;
	tooltipPosition: TooltipPosition;
	route: MenuRouteId;
	layoutEntered: boolean;
	menuReady: boolean;
}

type DemoAction =
	| { type: "SET_THEME"; value: "light" | "dark" }
	| { type: "SET_POSITION"; value: FluixPosition }
	| { type: "SET_LAYOUT"; value: LayoutMode }
	| { type: "TOGGLE_MENU_VARIANT" }
	| { type: "SET_NOTCH_TRIGGER"; value: NotchTrigger }
	| { type: "SET_NOTCH_OPEN"; value: boolean }
	| { type: "SET_TOOLTIP_POSITION"; value: TooltipPosition }
	| { type: "SET_ROUTE"; value: MenuRouteId }
	| { type: "INIT" };

function demoReducer(state: DemoState, action: DemoAction): DemoState {
	switch (action.type) {
		case "SET_THEME":
			return { ...state, theme: action.value };
		case "SET_POSITION":
			return { ...state, position: action.value };
		case "SET_LAYOUT":
			return { ...state, layout: action.value };
		case "TOGGLE_MENU_VARIANT":
			return { ...state, menuVariant: state.menuVariant === "tab" ? "pill" : "tab" };
		case "SET_NOTCH_TRIGGER":
			return { ...state, notchTrigger: action.value, notchOpen: false };
		case "SET_NOTCH_OPEN":
			return { ...state, notchOpen: action.value };
		case "SET_TOOLTIP_POSITION":
			return { ...state, tooltipPosition: action.value };
		case "SET_ROUTE":
			return { ...state, route: action.value };
		case "INIT":
			return { ...state, layoutEntered: true, menuReady: true };
		default:
			return state;
	}
}

function getInitialState(): DemoState {
	return {
		theme: "dark",
		position: "top-right",
		layout: "stack",
		menuVariant: "tab",
		notchTrigger: "hover",
		notchOpen: false,
		tooltipPosition: "top" as TooltipPosition,
		route:
			typeof window === "undefined" ? MENU_ITEMS[0].id : getMenuRouteFromHash(window.location.hash),
		layoutEntered: false,
		menuReady: false,
	};
}

/* ----------------------------- Sidebar ----------------------------- */

function DemoSidebar({
	state,
	dispatch,
	isMobile,
}: {
	state: DemoState;
	dispatch: React.Dispatch<DemoAction>;
	isMobile: boolean;
}) {
	const handleRouteChange = (id: string) => {
		const nextRoute = MENU_ITEMS.find((item) => item.id === id);
		if (!nextRoute) return;
		dispatch({ type: "SET_ROUTE", value: nextRoute.id });
		window.history.replaceState(null, "", nextRoute.hash);
	};

	return (
		<aside className="demo-sidebar">
			<div className="demo-sidebar-brand">Fluix</div>
			<div className="demo-sidebar-subtitle">Gooey Navigation</div>

			<button
				type="button"
				onClick={() => dispatch({ type: "TOGGLE_MENU_VARIANT" })}
				className="demo-pill demo-variant-toggle"
			>
				{state.menuVariant === "tab" ? "Tab" : "Pill"}
			</button>

			<Menu.Root
				orientation={isMobile ? "horizontal" : "vertical"}
				variant={state.menuVariant}
				theme={state.theme}
				activeId={state.menuReady ? state.route : null}
				onActiveChange={handleRouteChange}
				className="demo-sidebar-menu"
			>
				{MENU_ITEMS.map((item) => (
					<Menu.Item key={item.id} id={item.id}>
						{item.label}
					</Menu.Item>
				))}
			</Menu.Root>
		</aside>
	);
}

/* ----------------------------- Playground ----------------------------- */

function DemoPlayground({
	state,
	dispatch,
}: {
	state: DemoState;
	dispatch: React.Dispatch<DemoAction>;
}) {
	const activeRoute = useMemo(
		() => MENU_ITEMS.find((item) => item.id === state.route) ?? MENU_ITEMS[0],
		[state.route],
	);

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

	return (
		<section className="demo-content">
			<div className="demo-content-surface">
				<div className="demo-card">
					<div className="demo-header">
						<div>
							<h1 className="demo-title">{activeRoute.label}</h1>
							<p className="demo-subtitle">{activeRoute.subtitle}</p>
						</div>
						<label className="theme-toggle" aria-label="Cambiar tema oscuro y claro">
							<input
								type="checkbox"
								checked={state.theme === "dark"}
								onChange={(event) =>
									dispatch({ type: "SET_THEME", value: event.target.checked ? "dark" : "light" })
								}
							/>
							<span className="theme-toggle-track">
								<span className="theme-toggle-thumb" />
							</span>
							<span className="theme-toggle-label">
								{state.theme === "dark" ? "Dark" : "Light"}
							</span>
						</label>
					</div>
				</div>

				<div className="demo-card">
					<div className="demo-header">
						<div>
							<h2 className="demo-title">Fluix Playground</h2>
							<p className="demo-subtitle">
								Proba posiciones, tipos de toast, layout stack/notch y tema visual.
							</p>
						</div>
					</div>
				</div>

				<div className="demo-card">
					<div className="demo-row">
						{LAYOUTS.map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => dispatch({ type: "SET_LAYOUT", value: item })}
								className={`demo-pill ${state.layout === item ? "is-active" : ""}`}
							>
								Layout: {item}
							</button>
						))}
					</div>

					<div className="demo-row">
						{POSITIONS.map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => dispatch({ type: "SET_POSITION", value: item })}
								className={`demo-pill ${state.position === item ? "is-active" : ""}`}
							>
								{item}
							</button>
						))}
					</div>

					<hr className="demo-divider" />

					<div className="demo-row">
						<button
							type="button"
							onClick={() =>
								fluix.success({ title: "Saved!", description: "Your changes have been saved." })
							}
							className="demo-pill"
						>
							Success
						</button>
						<button
							type="button"
							onClick={() => fluix.error({ title: "Error", description: "Something went wrong." })}
							className="demo-pill"
						>
							Error
						</button>
						<button
							type="button"
							onClick={() => fluix.warning({ title: "Warning", description: "Please check this." })}
							className="demo-pill"
						>
							Warning
						</button>
						<button
							type="button"
							onClick={() => fluix.info({ title: "Info", description: "Just so you know." })}
							className="demo-pill"
						>
							Info
						</button>
						<button
							type="button"
							onClick={() =>
								fluix.action({
									title: "Action",
									description: "Confirm or dismiss.",
									button: { title: "Undo", onClick: () => fluix.info({ title: "Undone!" }) },
								})
							}
							className="demo-pill"
						>
							Action
						</button>
						<button
							type="button"
							onClick={() =>
								fluix.success({
									title: "Custom Icon",
									description: "You can pass your own icon.",
									icon: "✨",
								})
							}
							className="demo-pill"
						>
							Icon
						</button>
						<button
							type="button"
							onClick={() =>
								fluix.promise(createBookingPromise(), {
									loading: { title: "Confirming booking...", icon: "✈" },
									success: (data) => ({
										title: "Booking Confirmed",
										state: "success",
										roundness: 20,
										description: (
											<div className="flight-card">
												<div className="flight-card-top">
													<span className="flight-card-airline">{data.airline}</span>
													<span className="flight-card-pnr">PNR {data.pnr}</span>
												</div>
												<div className="flight-card-route">
													<span className="flight-card-code">{data.from}</span>
													<span className="flight-card-arrow">↗</span>
													<span className="flight-card-code">{data.to}</span>
												</div>
												<div className="flight-card-meta">Booking ID {data.bookingId}</div>
											</div>
										),
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
										description:
											"We could not complete your reservation. Try again in a few minutes.",
									}),
								})
							}
							className="demo-pill"
						>
							Promise
						</button>
					</div>

					<div className="demo-row">
						<button type="button" onClick={() => fluix.clear()} className="demo-pill">
							Clear
						</button>
					</div>
				</div>

				<div className="demo-card">
					<div className="demo-header">
						<div>
							<h2 className="demo-title">Notch Menu</h2>
							<p className="demo-subtitle">Liquid expanding pill with gooey SVG morphing.</p>
						</div>
					</div>

					<div className="demo-row">
						{NOTCH_TRIGGERS.map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => dispatch({ type: "SET_NOTCH_TRIGGER", value: t })}
								className={`demo-pill ${state.notchTrigger === t ? "is-active" : ""}`}
							>
								Trigger: {t}
							</button>
						))}
					</div>

					{state.notchTrigger === "manual" && (
						<div className="demo-row">
							<button
								type="button"
								onClick={() => dispatch({ type: "SET_NOTCH_OPEN", value: !state.notchOpen })}
								className="demo-pill"
							>
								{state.notchOpen ? "Close" : "Open"} Notch
							</button>
						</div>
					)}
				</div>

				<div className="demo-card">
					<div className="demo-header">
						<div>
							<h2 className="demo-title">Tooltip</h2>
							<p className="demo-subtitle">
								Spring entrance with gooey morph between grouped triggers.
							</p>
						</div>
					</div>

					<div className="demo-row">
						{TOOLTIP_POSITIONS.map((pos) => (
							<button
								key={pos}
								type="button"
								onClick={() => dispatch({ type: "SET_TOOLTIP_POSITION", value: pos })}
								className={`demo-pill ${state.tooltipPosition === pos ? "is-active" : ""}`}
							>
								{pos}
							</button>
						))}
					</div>

					<hr className="demo-divider" />

					<p className="demo-label">Individual</p>
					<div className="demo-row">
						<Tooltip.Root position={state.tooltipPosition}>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Save
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Save your progress</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root position={state.tooltipPosition}>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Delete
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Remove this item permanently</Tooltip.Content>
						</Tooltip.Root>
					</div>

					<hr className="demo-divider" />

					<p className="demo-label">Grouped (gooey morph)</p>
					<div className="demo-tooltip-group demo-row">
						<Tooltip.Root position={state.tooltipPosition} group="formatting">
							<Tooltip.Trigger>
								<button type="button" className="demo-pill demo-pill-icon">
									<strong>B</strong>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Bold</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root position={state.tooltipPosition} group="formatting">
							<Tooltip.Trigger>
								<button type="button" className="demo-pill demo-pill-icon">
									<em>I</em>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Italic</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root position={state.tooltipPosition} group="formatting">
							<Tooltip.Trigger>
								<button type="button" className="demo-pill demo-pill-icon">
									<u>U</u>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Underline</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root position={state.tooltipPosition} group="formatting">
							<Tooltip.Trigger>
								<button type="button" className="demo-pill demo-pill-icon">
									<s>S</s>
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Strikethrough</Tooltip.Content>
						</Tooltip.Root>
					</div>

					<hr className="demo-divider" />

					<p className="demo-label">Custom colors</p>
					<div className="demo-row">
						<Tooltip.Root
							position={state.tooltipPosition}
							bgColor="oklch(0.55 0.25 270)"
							textColor="#fff"
						>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Purple
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Violet vibes</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root
							position={state.tooltipPosition}
							bgColor="oklch(0.65 0.2 145)"
							textColor="#fff"
						>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Green
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Earthy tones</Tooltip.Content>
						</Tooltip.Root>
						<Tooltip.Root
							position={state.tooltipPosition}
							bgColor="oklch(0.7 0.18 50)"
							textColor="#1a1a1a"
						>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Amber
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>Warm warning</Tooltip.Content>
						</Tooltip.Root>
					</div>

					<hr className="demo-divider" />

					<p className="demo-label">Rich content</p>
					<div className="demo-row">
						<Tooltip.Root position={state.tooltipPosition}>
							<Tooltip.Trigger>
								<button type="button" className="demo-pill">
									Keyboard shortcut
								</button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<span className="demo-tooltip-rich-content" style={{ display: "flex" }}>
									Copy <kbd className="demo-kbd">Ctrl</kbd> + <kbd className="demo-kbd">C</kbd>
								</span>
							</Tooltip.Content>
						</Tooltip.Root>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ----------------------------- App ----------------------------- */

export default function App() {
	const [state, dispatch] = useReducer(demoReducer, undefined, getInitialState);
	const isMobile = useSyncExternalStore(mqlSubscribe, mqlSnapshot, mqlServerSnapshot);
	const toastTheme: "light" | "dark" = state.theme === "light" ? "dark" : "light";
	const toasterConfig = useMemo(
		() => ({
			position: state.position,
			layout: state.layout,
			offset: 24,
			defaults: {
				theme: toastTheme,
			},
		}),
		[state.position, state.layout, toastTheme],
	);

	useEffect(() => {
		const handleHashChange = () =>
			dispatch({ type: "SET_ROUTE", value: getMenuRouteFromHash(window.location.hash) });
		window.addEventListener("hashchange", handleHashChange);
		handleHashChange();

		const raf = requestAnimationFrame(() => dispatch({ type: "INIT" }));
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	return (
		<main className={`demo-shell theme-${state.theme} ${state.layoutEntered ? "is-entered" : ""}`}>
			<DemoSidebar state={state} dispatch={dispatch} isMobile={isMobile} />
			<DemoPlayground state={state} dispatch={dispatch} />

			<Toaster config={toasterConfig} />

			<Notch
				key={state.notchTrigger}
				trigger={state.notchTrigger}
				position="top-center"
				dotSize={36}
				roundness={20}
				theme={toastTheme}
				open={state.notchTrigger === "manual" ? state.notchOpen : undefined}
				onOpenChange={
					state.notchTrigger === "manual"
						? (open) => dispatch({ type: "SET_NOTCH_OPEN", value: open })
						: undefined
				}
				pill={
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				}
				content={
					<nav
						style={{
							display: "flex",
							gap: "1rem",
							padding: "0.25rem 1.75rem",
							fontSize: "0.85rem",
							fontWeight: 500,
						}}
					>
						<a href="#home" style={{ color: "inherit", textDecoration: "none" }}>
							Home
						</a>
						<a href="#about" style={{ color: "inherit", textDecoration: "none" }}>
							About
						</a>
						<a href="#work" style={{ color: "inherit", textDecoration: "none" }}>
							Work
						</a>
						<a href="#contact" style={{ color: "inherit", textDecoration: "none" }}>
							Contact
						</a>
					</nav>
				}
			/>
		</main>
	);
}
