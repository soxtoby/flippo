import "./basic.less";
import * as React from "react";
import { FlipScope, Flip } from "flippo-react";

export function Basic(props: { path: string }) {
    return <FlippingDemo />;
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