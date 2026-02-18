import { useMemo, useState } from "react";
import { Toaster, fluix, type FluixPosition } from "@fluix/react";

const POSITIONS: FluixPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [position, setPosition] = useState<FluixPosition>("top-right");
  const toastTheme: "light" | "dark" = theme === "light" ? "dark" : "light";
  const toasterConfig = useMemo(
    () => ({
      position,
      offset: 24,
      defaults: {
        theme: toastTheme,
      },
    }),
    [position, toastTheme],
  );

  return (
    <main className={`demo-shell theme-${theme}`}>
      <div className="demo-card">
        <div className="demo-header">
          <div>
            <h1 className="demo-title">Fluix Playground</h1>
            <p className="demo-subtitle">
              Probá posiciones, tipos de toast y tema visual desde un solo lugar.
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
            onClick={() => fluix.success({ title: "Saved!", description: "Your changes have been saved." })}
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
              fluix.promise(
                new Promise((resolve) => setTimeout(() => resolve("Upload complete"), 1800)),
                {
                  loading: { title: "Uploading..." },
                  success: (data) => ({ title: String(data), description: "Everything was processed." }),
                  error: (err) => ({ title: "Failed", description: String(err) }),
                },
              )
            }
            className="demo-pill"
          >
            Promise
          </button>
        </div>

        <div className="demo-row">
          <button
            type="button"
            onClick={() => fluix.clear()}
            className="demo-pill"
          >
            Clear
          </button>
        </div>
      </div>

      <Toaster config={toasterConfig} />
    </main>
  );
}
