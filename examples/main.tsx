import { Link, Redirect, Router } from "@reach/router";
import { createRoot } from "react-dom/client";
import { Basic } from "./basic";
import { Colors } from "./color-list";
import { Expand } from "./expand";
import "./main.less";
let hippo = require("../assets/hippo.svg");

createRoot(document.getElementById('root')!)
    .render(<>
        <header>
            <img src={hippo} />
            <h3>Flippo Examples</h3>
            <Link to="basic">Basic Examples</Link>
            <Link to="colors">2D List</Link>
            <Link to="expand">Parent/Child</Link>
        </header>
        <article>
            <Router>
                <Redirect from="/" to="basic" />
                <Basic path="basic" />
                <Colors path="colors" />
                <Expand path="expand" />
            </Router>
        </article>
    </>);
