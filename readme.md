# ![upside down hippo](/assets/hippo.svg) Flippo
Flipping easy transitions.

Uses the [FLIP](https://aerotwist.com/blog/flip-your-animations/) technique to transition elements from one state to another.

> **Warning**
> Flippo is still very much a work-in-progress. Expect the API to change.

## Getting Started with React
Install with yarn or NPM:
```
yarn add flippo-react
```
```
npm install --save flippo-react
```

Import `flippo-react`:
```tsx
import { Flip } from "flippo-react";
```

Wrap elements you want to transition in the `Flip` component:
```tsx
<Flip><div className="box"></div></Flip>
```

> **Note**
> Flipped elements must forward their `ref` to an element.

### Animating layout
By default, `Flip` will only fade elements in and out. To scale and translate the element, add the `scale` and `position` props:
```tsx
<Flip scale position><div className="box"></div></Flip>
```

You can restrict the axis the element is animated on, by setting `scale` and `position` to `"x"` or `"y"`:
```tsx
<Flip scale="x" position="y"><div className="box"></div></Flip>
```

If one component affects the layout of other components without causing them to re-render, you can specify a `group` name to animate everything in the group together:
```tsx
import { Flip, FlipScope } from "flippo-react";
import { memo } from "react";

function Accordion() {
    return <>
        <AccordionSection title="One" />
        <AccordionSection title="Two" />
        <AccordionSection title="Three" />
    </>
}

function AccordionSection({ title }: { title: string; }) {
    let [expanded, setExpanded] = useState(false);

    return <Flip group="accordion-section">
        <div className={expanded ? 'expanded' : 'collapsed'}>
        <span onClick={() => setExpanded(e => !e)}>
            {title}
        </span>
    </Flip>
}
```

### Animating between elements
To transition from one element to a another element, give them the same id:
```tsx
showLarge
    ? <Flip scale id="box"><div className="large"></div></Flip>
    : <Flip scale id="box"><div className="small"></div></Flip>
```

### Customizing animations
`enter`, `update`, and `exit` animations can be configured on individual `Flip` elements, or passed down using a `FlipScope` element:
```tsx
<FlipScope config={{
    enter: {{ duration: 1000, style: { width: 0, height: 0 } }}
    update: {{ duration: 500 }}
    exit: {{ duration: 1000, style: { width: 0, height: 0 } }}
}}>
    <Flip><div className="box"></div></Flip>
</FlipScope>
```

`FlipScope`s also have their own `enter` and `exit` props, which apply to `Flip` elements in scope only when the `FlipScope` itself is entering or exiting. This can be useful to avoid an initial enter animation when the page is first loaded:
```tsx
<FlipScope enter={false}>
    <Flip><div className="box"></div></Flip>
</FlipScope>
```

## Running the Examples
1. Download the source.
2. In the root folder, run `yarn` to fetch dependencies and build.
3. Run `yarn examples`, which will start a local server and open the examples in your default browser.

---
Hippo image from [Twemoji](https://github.com/twitter/twemoji), licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).