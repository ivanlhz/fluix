<script lang="ts">
import { type FluixPosition, fluix } from "@fluix-ui/svelte";
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

let theme = $state<"light" | "dark">("dark");
const position = $state<FluixPosition>("top-right");
const layout = $state<LayoutMode>("stack");

const toastTheme = $derived<"light" | "dark">(theme === "light" ? "dark" : "light");
const toasterConfig = $derived({
	position,
	layout,
	offset: 24,
	defaults: { theme: toastTheme },
});

const toggleTheme = () => {
	theme = theme === "dark" ? "light" : "dark";
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

<main class="demo-shell theme-{theme}">
	<div class="demo-card">
		<div class="demo-header">
			<div>
				<h1 class="demo-title">Fluix Playground (Svelte)</h1>
				<p class="demo-subtitle">
					Proba posiciones, tipos de toast, layout stack/notch y tema visual.
				</p>
			</div>
			<button type="button" class="demo-pill" onclick={toggleTheme}>
				{theme === "dark" ? "Dark" : "Light"}
			</button>
		</div>

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

	<Toaster config={toasterConfig} />
</main>
