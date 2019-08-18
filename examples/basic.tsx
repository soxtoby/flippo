import "./basic.less";
import * as React from "react";
import { FlipScope, Flip } from "flippo-react";

export function Basic(props: { path: string }) {
    return <>
        <FlippingDemo />
        <VisibilityDemo />
    </>;
}

// Should match example in readme
function FlippingDemo() {
    let [showLarge, setShowLarge] = React.useState(false);

    return <FlipScope triggerData={showLarge}>
        <button onClick={() => setShowLarge(large => !large)}>Toggle size</button>
        {showLarge
            ? <Flip id="box"><div className="large"></div></Flip>
            : <Flip id="box"><div className="small"></div></Flip>
        }
    </FlipScope>;
}

function VisibilityDemo() {
    let [visible, setVisible] = React.useState(true);

    return <FlipScope triggerData={visible}>
        <button onClick={() => setVisible(v => !v)}>Toggle visibility</button>
        {visible &&
            <Flip id="visibility">
                <div className="small"></div>
            </Flip>
        }
    </FlipScope>
}