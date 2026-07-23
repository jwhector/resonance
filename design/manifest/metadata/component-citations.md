# Component citations — verified get_metadata dumps (R1)

Saved `get_metadata` output (file `UYlkCL7jkCVgKWiqAVlEFp`) proving the bespoke-component /
primitive node ids cited in `@resonance/ui` code actually exist (ADR-0019 R1). The
frame-level inventory lives in `mvp-flow-inventory.md`; this file captures the **deep-child**
ids that the frame-level dump doesn't reach. Pulled under `resonance-cbbd`.

## Email verify frame `1526:79050` (proves mail-icon `1526:79082`)

```xml
<frame id="1526:79050" name="Onboarding/Creator/CreateAccount/EmailVerication" width="1512" height="982">
  <frame id="1526:79109" name="Frame 1000002723" width="400" height="344">
    <frame id="1526:79108" width="400" height="134">
      <instance id="1526:79082" name="Mail" x="184" y="0" width="32" height="32" />        <!-- MailIcon -->
      <frame id="1526:79105">
        <text id="1526:79084" name="Check your email to continue" />
        <text id="1526:79085" name="We’ve sent an email to jimchoi@gmail.com. …" />
      </frame>
    </frame>
    <instance id="1526:79086" name="InputList" width="256" height="40" />                    <!-- OtpInput -->
    <frame id="1526:79106">
      <instance id="1526:79078" name="Button/Wide" width="400" height="56" />                <!-- Button size="wide" -->
      <frame id="1526:79088">
        <text id="1526:79089" name="Didn’t get the email?" />
        <instance id="1526:79090" name="Button" width="67" height="24" />                    <!-- "Try again" -->
      </frame>
    </frame>
  </frame>
</frame>
```

## Search Keywords section `1485:49377` (proves TagGroup `1485:49379`)

```xml
<frame id="1485:49377" name="SearchKeywords" width="648" height="98">
  <text id="1485:49378" name="Search Keywords" />
  <frame id="1485:49379" name="TagGroup" width="648" height="42">                            <!-- Tag / TagGroup -->
    <instance id="1485:49380" name="Tags" /> <instance id="1485:49381" name="Tags" />
    <instance id="1485:49382" name="Tags" /> <instance id="1485:49383" name="Tags" />
    <instance id="1485:49384" name="Tags" />
  </frame>
</frame>
```

## Composer component `434:1194` (proves the WeaveComposer / Input/Wide node)

```xml
<symbol id="434:1194" name="Property 1=Wide, Property 2=Default" width="1270" height="96" /> <!-- WeaveComposer -->
```

## Verdict (R1)

| Cited id      | Component                    | Status                                                                                                                |
| ------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `1526:79082`  | `MailIcon`                   | ✅ verified — `Mail` instance in `1526:79050`                                                                         |
| `1485:49379`  | `Tag` / `TagGroup`           | ✅ verified — `TagGroup` in `1485:49377`                                                                              |
| `434:1194`    | `WeaveComposer`              | ✅ verified — `Input/Wide` symbol                                                                                     |
| `1443:114245` | (was `weave-interview-rail`) | ✅ removed — it was the 40px collapsed Orders rail; now cites verified `1443:78282`/`78283` (`mvp-flow-inventory.md`) |

No fabricated citations remain in `@resonance/ui`. Machine-checked Code Connect (R4) is the
remaining upgrade — tracked separately (needs the `@figma/code-connect` tooling + a
`FIGMA_ACCESS_TOKEN` publish, which can't be verified headlessly).
