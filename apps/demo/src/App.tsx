import { type FluixPosition, Toaster, fluix } from "@fluix-ui/react";
import { useMemo, useState } from "react";

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

export default function App() {
	const [theme, setTheme] = useState<"light" | "dark">("dark");
	const [position, setPosition] = useState<FluixPosition>("top-right");
	const [layout, setLayout] = useState<LayoutMode>("stack");
	const toastTheme: "light" | "dark" = theme === "light" ? "dark" : "light";
	const toasterConfig = useMemo(
		() => ({
			position,
			layout,
			offset: 24,
			defaults: {
				theme: toastTheme,
			},
		}),
		[position, layout, toastTheme],
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
		<main className={`demo-shell theme-${theme}`}>
			<div className="demo-card">
				<div className="demo-header">
					<div>
						<h1 className="demo-title">Fluix Playground</h1>
						<p className="demo-subtitle">
							Proba posiciones, tipos de toast, layout stack/notch y tema visual.
						</p>
					</div>
					<label className="theme-toggle" aria-label="Cambiar tema oscuro y claro">
						<input
							type="checkbox"
							checked={theme === "dark"}
							onChange={(event) => setTheme(event.target.checked ? "dark" : "light")}
						/>
						<span className="theme-toggle-track">
							<span className="theme-toggle-thumb" />
						</span>
						<span className="theme-toggle-label">{theme === "dark" ? "Dark" : "Light"}</span>
					</label>
				</div>

				<div className="demo-row">
					{LAYOUTS.map((item) => (
						<button
							key={item}
							type="button"
							onClick={() => setLayout(item)}
							className={`demo-pill ${layout === item ? "is-active" : ""}`}
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
							onClick={() => setPosition(item)}
							className={`demo-pill ${position === item ? "is-active" : ""}`}
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

			<Toaster config={toasterConfig} />
		</main>
	);
}
