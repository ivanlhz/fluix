import { mount } from "svelte";
import Showcase from "./Showcase.svelte";
import "@fluix-ui/css";

mount(Showcase, { target: document.getElementById("app")! });
