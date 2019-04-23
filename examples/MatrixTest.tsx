import * as React from "react";
import * as m from "transformation-matrix";
import { useState, useRef } from "react";
import { interpolate, derive, animate } from "../lib/animate";

export function MatrixTest(props: { path: string }) {
    let [transform, setTransform] = useState(false);

    let parentMatrix = m.transform(
        // m.translate(50, 50),
        m.scale(2, 2));
    let parentTransform = m.toCSS(m.rotateDEG(45))//'scale(2, 2)'// m.toCSS(parentMatrix);
    let childTransform = m.toCSS(m.rotateDEG(-45))//'scale(0.5, 0.5)'// m.toCSS(m.inverse(parentMatrix));

    let parentStyle: React.CSSProperties = {
        width: 300,
        height: 300,
        border: '1px solid blue',
        background: 'dodgerblue',
        // transition: '500ms linear',
        transformOrigin: '0 0',
        transform: transform ? parentTransform : 'none'
    };
    let childStyle: React.CSSProperties = {
        width: 100,
        height: 100,
        border: '1px solid red',
        background: 'orchid',
        position: 'relative',
        // transition: '500ms linear',
        transformOrigin: '0 0',
        transform: 'translate(10px, 10px)'
    };

    let parentRef = useRef<HTMLDivElement>();
    let childRef = useRef<HTMLDivElement>();

    return <div ref={parentRef} style={parentStyle} onClick={() => doAnimation()}>
        <div ref={childRef} style={childStyle}></div>
    </div>;

    function doAnimation() {
        let parentScale = interpolate(1, 2);
        let childScale = derive(parentScale, s => 1 / s);
        let parentX = interpolate(0, 0);
        let childX = derive(parentX, x => 10 - x);
        let childY = interpolate(10, 10);
        animate({ parentScale, childScale, parentX, childX, childY }, 500, (current) => {
            parentRef.current.style.transform = `translateX(${current.parentX}px) scale(${current.parentScale})`;
            childRef.current.style.transform = `translate(-1px, -1px) scale(${current.childScale}) translate(1px, 1px) translateX(${current.childX}px) translateY(${current.childY}px)`;
        });
    }
}