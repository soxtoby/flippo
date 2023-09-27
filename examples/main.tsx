import { Link, Redirect, Router } from "@reach/router";
import { enableDebugging } from "flippo-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Basic } from "./basic";
import { Colors } from "./color-list";
import { Expand } from "./expand";
import "./main.less";
let hippo = require("../assets/hippo.svg");

createRoot(document.getElementById('root')!)
    .render(<Main />);

function Main() {
    let [debug, setDebug] = useState(false);
    useEffect(() => {
        enableDebugging(debug);
    }, [debug]);

    return <>
        <header>
            <img src={hippo} width={32} height={32} />
            <h3>Flippo Examples</h3>
            <Link to="basic">Basic Examples</Link>
            <Link to="colors">2D List</Link>
            <Link to="expand">Parent/Child</Link>
            <label>
                <input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />
                <span>Debug</span>
            </label>
        </header>
        <article>
            <Router>
                <Redirect from="/" to="basic" />
                <Basic path="basic" />
                <Colors path="colors" />
                <Expand path="expand" />
            </Router>
        </article>
    </>
}