<script setup lang="ts">
import { type FluixPosition, fluix } from "@fluix/vue";
import { computed, h, ref } from "vue";

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

const theme = ref<"light" | "dark">("dark");
const position = ref<FluixPosition>("top-right");
const layout = ref<LayoutMode>("stack");

const toastTheme = computed<"light" | "dark">(() => (theme.value === "light" ? "dark" : "light"));

const toasterConfig = computed(() => ({
	position: position.value,
	layout: layout.value,
	offset: 24,
	defaults: { theme: toastTheme.value },
}));

const toggleTheme = () => {
	theme.value = theme.value === "dark" ? "light" : "dark";
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
	<main :class="`demo-shell theme-${theme}`">
		<div class="demo-card">
			<div class="demo-header">
				<div>
					<h1 class="demo-title">Fluix Playground (Vue)</h1>
					<p class="demo-subtitle">
						Proba posiciones, tipos de toast, layout stack/notch y tema visual.
					</p>
				</div>
				<button type="button" class="demo-pill" @click="toggleTheme">
					{{ theme === "dark" ? "Dark" : "Light" }}
				</button>
			</div>

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

		<Toaster :config="toasterConfig" />
	</main>
</template>
