# Member/Search frames — verified node inventory (R1)

Node ids proving the Member/Search citations in `design/manifest/screens/08-*` … `12-*`
actually exist. **Not** a REST `get_metadata` dump — Figma REST is `403` (see
[../PROVENANCE.md](../PROVENANCE.md)). This inventory was read out of the live Figma
document through the **Desktop Bridge plugin** (`figma_execute` → `getNodeByIdAsync` +
tree walk), which is the only working read path today.

- **fileKey:** `vC0O5uyMmw1o5vYHmCoOXq` (`Resonance (Copy)`), page **MVP**
- **Read at:** `2026-07-26T23:41:08Z`
- **provenance:** `copy-derived` — ids are preserved from the canonical file at copy time
  but diverge in meaning as the designer keeps editing the original.
- Pulled under `resonance-80bf`.

Every id below was resolved individually in that session. Ids of the form
`I<instance>;<child>` are instance-internal and only resolve by walking the parent
instance's `children` — `getNodeByIdAsync` on them hangs the bridge.

## Frame roots (page `MVP`, canvas `1413:46640`)

```xml
<frame id="1443:78098" name="Member/Search/Home"             width="1512" height="982" />
<frame id="1443:78123" name="Member/Search/Result/Products"  width="1512" height="982" />
<frame id="1443:78133" name="Member/Search/Result/Services"  width="1512" height="982" />
<frame id="1443:78143" name="Member/Search/Result/Posts"     width="1512" height="982" />
<frame id="1443:78153" name="Member/Search/Result/Creators"  width="1512" height="982" />
<frame id="1463:71449" name="Onboarding/Creator/SignIn"      width="1512" height="982" />
```

`1463:71449` is listed here because manifest screen **07** cited it as "Member feed home".
Its real Figma name is `Onboarding/Creator/SignIn`. See `_index.md` row 07.

## `Member/Search/Result/Creators` `1443:78153` — the Slice A contract

```xml
<frame id="1443:78153" name="Member/Search/Result/Creators" width="1512" height="982" fill="#ffffff">
  <instance id="1443:78154" name="Sidebar/Customer/MVP" x="1" y="0" width="80" height="982">
    <rectangle id="I1443:78154;1325:21610" x="80" width="1" height="982" fill="#cdcdcd" />  <!-- right hairline -->
    <frame     id="I1443:78154;1325:21611" name="Frame 49" x="14" y="24" width="52" height="128">  <!-- VERTICAL gap 24 -->
      <group    id="I1443:78154;1325:21612" name="Group 1000002012" />                      <!-- Resonance wave mark 53x16 -->
      <instance id="I1443:78154;1325:21615" name="Icon/Home" x="28" y="64" width="24" height="24" />
      <instance id="I1443:78154;1400:55446" name="ProfileImg/Circle/40px" x="20" y="112" width="40" height="40" />
    </frame>
  </instance>
  <instance id="1443:78155" name="Weave/Sidebar" x="81" y="0" width="40" height="982">
    <instance id="I1443:78155;1400:56354" name="Weave/IconGroup" x="89" y="24" width="24" height="72">
      <instance id="I1443:78155;1400:56354;1400:56339" name="Symbol/Weave/24px"    x="89" y="24" width="24" height="24" />
      <instance id="I1443:78155;1400:56354;1400:56340" name="Icon/DropDownArrow"   x="89" y="72" width="24" height="24" />
    </instance>
  </instance>
  <frame id="1443:78156" name="Main" x="133" y="0" width="1392" height="982">              <!-- NOTE: x=133; siblings use 120 -->
    <frame id="1443:78157" name="Frame 1000002705" x="527" y="40" width="604">             <!-- VERTICAL gap 40 -->
      <instance id="1443:78158" name="SearchBar/Filled" width="604" height="56" r="8" fill="#ffffff" stroke="#cdcdcd w1" />
      <instance id="1443:78159" name="Tabs/Search"      width="604" height="49">           <!-- HORIZONTAL gap 0, 4 x 151 -->
        <instance id="I1443:78159;1439:49011" name="Tab/Fixed/RegularT" width="151" height="49">   <!-- Products, idle -->
          <text      id="I1443:78159;1439:49011;1439:48919" name="Product" fill="#a6a6a6" />
          <rectangle id="I1443:78159;1439:49011;1439:48920" width="151" height="2" fill="#a6a6a6" />
        </instance>
        <instance id="I1443:78159;1439:49012" name="Tab/Fixed/RegularT" width="151" height="49">   <!-- Services, idle -->
          <text      id="I1443:78159;1439:49012;1439:48919" name="Product" fill="#a6a6a6" />
          <rectangle id="I1443:78159;1439:49012;1439:48920" width="151" height="2" fill="#a6a6a6" />
        </instance>
        <instance id="I1443:78159;1439:49013" name="Tab/Fixed/RegularT" width="151" height="49">   <!-- Posts, idle -->
          <text      id="I1443:78159;1439:49013;1439:48919" name="Product" fill="#a6a6a6" />
          <rectangle id="I1443:78159;1439:49013;1439:48920" width="151" height="2" fill="#a6a6a6" />
        </instance>
        <instance id="I1443:78159;1439:49014" name="Tab/Fixed/RegularT" width="151" height="49">   <!-- Creators, ACTIVE -->
          <text      id="I1443:78159;1439:49014;1439:48928" name="Product" fill="#2b2b2b" />
          <rectangle id="I1443:78159;1439:49014;1439:48929" width="151" height="2" fill="#2b2b2b" />
        </instance>
      </instance>
      <frame id="1443:78160" name="Frame 1000002698" width="604">                          <!-- VERTICAL gap 24, result list -->
        <instance id="1443:78161" name="List/Profile&amp;Button/Small" width="604" height="48" />  <!-- Following state -->
        <instance id="1531:78482" name="List/Profile&amp;Button/Small" width="604" height="48" />  <!-- Following state -->
        <instance id="1443:78163" name="List/Profile&amp;Button/Small" width="604" height="48" />  <!-- Follow state -->
        <instance id="1443:78164" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78165" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78166" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1531:78488" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78167" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78168" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1531:78491" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78169" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78170" name="List/Profile&amp;Button/Small" width="604" height="48" />
        <instance id="1443:78171" name="List/Profile&amp;Button/Small" width="604" height="48" />
      </frame>
    </frame>
  </frame>
</frame>
```

### Result row internals — `List/Profile&Button/Small`

Follow state, walked from `1443:78163`:

```xml
<instance name="List/Profile&amp;Button/Small" width="604" height="48">      <!-- HORIZONTAL, align CENTER, space-between -->
  <frame name="Frame 1000002180" height="48">                                <!-- HORIZONTAL gap 16, align CENTER -->
    <instance name="ProfileImg/Square/48" width="48" height="48">
      <rectangle name="ProfileImg" width="48" height="48" fill="#d9d9d9" r="8" />   <!-- placeholder plate -->
      <rectangle name="image 162"  width="48" height="51" fill="IMAGE" />           <!-- photo fill -->
    </instance>
    <frame name="Frame 1000002179">                                          <!-- VERTICAL gap 0, align MIN -->
      <frame name="Frame 1000002178" height="24">                            <!-- HORIZONTAL gap 16, align MIN -->
        <text     name="North Star Fermentation" fill="#000000" />           <!-- HN Medium 16/24 -->
        <instance name="Symbol/Weave/24px" width="24" height="24" />         <!-- Weave badge -->
      </frame>
      <text name="By Mike" fill="#a6a6a6" />                                 <!-- HN Regular 16/24 -->
    </frame>
  </frame>
  <instance name="Button/Small" width="81" height="48" fill="#6034ff" r="8"> <!-- pad 12/16, gap 10, align CENTER -->
    <text name="Button" fill="#ffffff" />                                    <!-- "Follow", HN Medium 16/24 -->
  </instance>
</instance>
```

Following state, walked from `1443:78161` — identical except the button:

```xml
  <instance name="Button/Small" width="104" height="48" fill="#f2f2f2" r="8">
    <text name="Button" fill="#2b2b2b" />                                    <!-- "Following", HN Medium 16/24 -->
  </instance>
```

### Search bar internals — `SearchBar/Filled` `1443:78158`

```xml
<instance id="1443:78158" name="SearchBar/Filled" width="604" height="56" r="8" fill="#ffffff" stroke="#cdcdcd w1">
  <frame id="I1443:78158;1439:48907" name="Content" width="572" height="24">   <!-- pad 16 all sides, HORIZONTAL gap 8, align CENTER -->
    <instance name="Icon/Search" width="24" height="24" />
    <frame name="Frame 1000002708" width="540" height="24">                    <!-- HORIZONTAL gap 8, align CENTER -->
      <text     name="Creator" fill="#2b2b2b" />                               <!-- query text, HN Regular 16/24 -->
      <instance name="Icon" width="16" height="16" />                          <!-- clear (×) affordance -->
    </frame>
  </frame>
</instance>
```

## Sibling result frames — shared chrome

```xml
<frame id="1443:78123" name="Member/Search/Result/Products" width="1512" height="982" fill="#ffffff">
  <instance id="1443:78124" name="Sidebar/Customer/MVP" x="1" width="80" height="982" />
  <instance id="1443:78125" name="Weave/Sidebar"        x="81" width="40" height="982" />
  <frame id="1443:78126" name="Main" x="120" width="1392" height="982">
    <frame id="1443:78127" name="Frame 1000002702" x="514" y="40" width="604" height="1659">  <!-- VERTICAL gap 40 -->
      <instance id="1443:78128" name="SearchBar/Filled" width="604" height="56" />
      <instance id="1443:78129" name="Tabs/Search"      width="604" height="49" />            <!-- Products active -->
      <frame    id="1443:78130" name="Frame 1000002700" width="604" height="1474" />          <!-- VERTICAL gap 40, product cards -->
    </frame>
  </frame>
</frame>

<frame id="1443:78133" name="Member/Search/Result/Services" width="1512" height="982" fill="#ffffff">
  <frame id="1443:78136" name="Main" x="120" width="1392" height="982">
    <frame id="1443:78137" name="Frame 1000002703" x="514" y="40" width="604" height="1863">
      <instance id="1443:78138" name="SearchBar/Filled" width="604" height="56" />
      <instance id="1443:78139" name="Tabs/Search"      width="604" height="49" />            <!-- Services active -->
      <frame    id="1443:78140" name="Frame 1000002701" width="604" height="1678" />          <!-- VERTICAL gap 40, service cards -->
    </frame>
  </frame>
</frame>

<frame id="1443:78143" name="Member/Search/Result/Posts" width="1512" height="982" fill="#ffffff">
  <frame id="1443:78146" name="Main" x="120" width="1392" height="982">
    <frame id="1443:78147" name="Frame 1000002704" x="514" y="40" width="604" height="1409">
      <instance id="1443:78148" name="SearchBar/Filled" width="604" height="56" />
      <instance id="1443:78149" name="Tabs/Search"      width="604" height="49" />            <!-- Posts active -->
      <frame    id="1443:78150" name="Frame 1000002699" width="604" height="1224" />          <!-- VERTICAL gap 40, post cards -->
    </frame>
  </frame>
</frame>
```

## `Member/Search/Home` `1443:78098` — feed shell (unclaimed; needs Slice C)

```xml
<frame id="1443:78098" name="Member/Search/Home" width="1512" height="982" fill="#ffffff">
  <instance id="1443:78108" name="Sidebar/Customer/MVP" x="1"  width="80" height="982" />
  <instance id="1443:78109" name="Weave/Sidebar"        x="81" width="40" height="982" />
  <frame id="1443:78099" name="Frame 1000002337" x="120" width="1392" height="2534">
    <frame id="1443:78104" name="Frame 1000002696" x="194" y="40" width="716" height="1607">  <!-- VERTICAL gap 40, centre feed -->
      <instance id="1443:78105" name="Home/TopBar" width="716" height="80" />                 <!-- avatar + "What's on your mind?" -->
      <instance id="1443:78106" name="Post"        width="716" height="763" />
      <instance id="1443:78107" name="Post"        width="716" height="684" />
    </frame>
    <frame id="1443:78101" name="Frame 1000002697" x="1037" y="40" width="395" height="364">  <!-- VERTICAL gap 24, right rail -->
      <instance id="1443:78102" name="SearchBar/Filled" width="395" height="56" r="8" stroke="#cdcdcd w1" />  <!-- "Search on Resonance" -->
      <instance id="1443:78103" name="Panel/Home"       width="395" height="284" r="8" stroke="#cdcdcd w1" /> <!-- Cart panel -->
    </frame>
    <instance id="1443:78100" name="Post" x="200" y="1595" width="708" height="895" />        <!-- below the fold -->
  </frame>
</frame>
```
