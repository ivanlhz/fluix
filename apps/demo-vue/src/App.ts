import { computed, defineComponent, h, ref } from "vue";
import { Toaster, fluix, type FluixPosition } from "@fluix/vue";

const POSITIONS: FluixPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

export default defineComponent({
	name: "DemoVueApp",
	setup() {
		const theme = ref<"light" | "dark">("dark");
		const position = ref<FluixPosition>("top-right");

		const toastTheme = computed<"light" | "dark">(() =>
			theme.value === "light" ? "dark" : "light",
		);

		const toasterConfig = computed(() => ({
			position: position.value,
			offset: 24,
			defaults: { theme: toastTheme.value },
		}));

		const toggleTheme = () => {
			theme.value = theme.value === "dark" ? "light" : "dark";
		};

		return () =>
			h("main", { class: `demo-shell theme-${theme.value}` }, [
				h("div", { class: "demo-card" }, [
					h("div", { class: "demo-header" }, [
						h("div", null, [
							h("h1", { class: "demo-title" }, "Fluix Playground (Vue)"),
							h(
								"p",
								{ class: "demo-subtitle" },
								"Probá posiciones, tipos de toast y tema visual desde Vue.",
							),
						]),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: toggleTheme,
							},
							theme.value === "dark" ? "Dark" : "Light",
						),
					]),
					h(
						"div",
						{ class: "demo-row" },
						POSITIONS.map((item) =>
							h(
								"button",
								{
									key: item,
									type: "button",
									class: `demo-pill ${position.value === item ? "is-active" : ""}`,
									onClick: () => {
										position.value = item;
									},
								},
								item,
							),
						),
					),
					h("hr", { class: "demo-divider" }),
					h("div", { class: "demo-row" }, [
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.success({
										title: "Saved!",
										description: "Your changes have been saved.",
									}),
							},
							"Success",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.error({
										title: "Error",
										description: "Something went wrong.",
									}),
							},
							"Error",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.warning({
										title: "Warning",
										description: "Please check this.",
									}),
							},
							"Warning",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.info({
										title: "Info",
										description: "Just so you know.",
									}),
							},
							"Info",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.action({
										title: "Action",
										description: "Confirm or dismiss.",
										button: {
											title: "Undo",
											onClick: () => {
												fluix.info({ title: "Undone!" });
											},
										},
									}),
							},
							"Action",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.success({
										title: "Custom Icon",
										description: "You can pass your own icon.",
										icon: "*",
									}),
							},
							"Icon",
						),
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () =>
									fluix.promise(
										new Promise((resolve) =>
											setTimeout(() => resolve("Upload complete"), 1800),
										),
										{
											loading: { title: "Uploading..." },
											success: (data: unknown) => ({
												title: String(data),
												description: "Everything was processed.",
											}),
											error: (err: unknown) => ({
												title: "Failed",
												description: String(err),
											}),
										},
									),
							},
							"Promise",
						),
					]),
					h("div", { class: "demo-row" }, [
						h(
							"button",
							{
								type: "button",
								class: "demo-pill",
								onClick: () => fluix.clear(),
							},
							"Clear",
						),
					]),
				]),
				h(Toaster, { config: toasterConfig.value }),
			]);
	},
});
