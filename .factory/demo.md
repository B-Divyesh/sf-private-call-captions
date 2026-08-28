# Demo sandbox

Open `https://private-call-captions.sociobot.in/demo/` (or `/demo/` in a local static build).

The page immediately shows three realistic appointment-call captions. It has no microphone permission, account, model file, or desktop-app storage dependency. Demo state uses only the `demo:private-call-captions:sample` local-storage key. **Reset demo** removes and reseeds that key. **Start for real** removes it before returning home.

The installed desktop app keeps its normal settings separately, including its `pcc:model` key. The browser tests start with a fresh context and verify that the namespaces do not overlap.
