import { Link, Redirect, Router } from "@reach/router";
import * as React from "react";
import ReactDOM from "react-dom";
import { Colors } from "./color-list";
import { Expand } from "./expand";
import "./main.less";
import { MatrixTest } from "./MatrixTest";

ReactDOM.render(
    <>
        <header>
            <Link to="colors">2D List</Link>
            <Link to="expand">Parent/child</Link>
            <Link to="matrix">Matrix test</Link>
        </header>
        <article>
            <Router>
                <Redirect from="/" to="colors" />
                <Colors path="colors" />
                <Expand path="expand" />
                <MatrixTest path="matrix" />
            </Router>
        </article>
    </>,
    document.getElementById('root'));
