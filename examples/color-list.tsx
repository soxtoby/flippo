import { Flip, FlipScope } from "flippo-react";
import * as React from "react";
import { useState } from "react";
import "./color-list.less";
import { colors } from "./colors";

export function Colors(props: { path: string }) {
    let [shownColors, setColors] = useState(colors.slice());

    return <div className="example">
        <div className="buttons">
            <button onClick={() => setColors(randomColors())}>Random</button>
            <button onClick={() => setColors(randomOrder(shownColors))}>Reorder</button>
        </div>
        <div className="colorList">
            {shownColors.map(color => <Color color={color} key={color} />)}
        </div>
    </div>
}

function randomColors() {
    return colors.filter(() => Math.random() > 0.5);
}

function randomOrder(source: string[]) {
    let target = [];
    while (source.length)
        target.push(...source.splice(Math.floor(Math.random() * source.length), 1));
    return target;
}

function Color({ color }: { color: string }) {
    return <Flip>
        <div className="color">
            <div className="color-swatch" style={{ color }}></div>
            <div className="color-name">{color}</div>
        </div>
    </Flip>;
}