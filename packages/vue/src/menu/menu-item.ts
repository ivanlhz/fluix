import { defineComponent, h } from "vue";
import { useMenuContext } from "./menu-context";

export const MenuItem = defineComponent({
	name: "FluixMenuItem",
	props: {
		id: {
			type: String,
			required: true,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		className: {
			type: String,
			required: false,
		},
	},
	setup(props, { slots }) {
		const context = useMenuContext();

		return () => {
			const active = context.activeId() === props.id;
			const itemAttrs = context.attrs().item({ id: props.id, active, disabled: props.disabled });

			const handleClick = () => {
				if (props.disabled) return;
				context.setActive(props.id);
			};

			return h(
				"button",
				{
					type: "button",
					...itemAttrs,
					disabled: props.disabled,
					class: props.className,
					onClick: handleClick,
				},
				slots.default?.(),
			);
		};
	},
});
