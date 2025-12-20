import { enableDebugging } from "flippo-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Link, Redirect, Route, Switch, useRoute } from "wouter";
import { Basic } from "./basic";
import { Colors } from "./color-list";
import { Expand } from "./expand";
import "./main.css";
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
            <NavLink href="/">Basic Examples</NavLink>
            <NavLink href="/colors">2D List</NavLink>
            <NavLink href="/expand">Parent/Child</NavLink>
            <label>
                <input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />
                <span>Debug</span>
            </label>
        </header>
        <main>
            <Switch>
                <Route path="/" component={Basic} />
                <Route path="/colors" component={Colors} />
                <Route path="/expand" component={Expand} />
                <Route><Redirect to="/" /></Route>
            </Switch>
        </main>
    </>
}

function NavLink(props: { href: string, children: React.ReactNode }) {
    let [isActive] = useRoute(props.href);
    return <Link href={props.href}>
        <a className={isActive ? 'is-active' : ''}>{props.children}</a>
    </Link>;
}