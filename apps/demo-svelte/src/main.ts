import { mount } from "svelte";
import App from "./App.svelte";
import "@fluix-ui/css";
import "./main.css";

mount(App, { target: document.getElementById("app")! });
