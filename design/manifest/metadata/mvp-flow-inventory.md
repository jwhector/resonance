# MVP Page — Design Screen Inventory

> Audit target: **Creator Onboarding: Signup -> Verify -> Interview -> ProfileGen**.
> Source: Figma `get_metadata` for page **MVP** (canvas `1413:46640`).
> Generated from the saved metadata dump; node ids are verbatim.

**Canvas totals (direct children of page):** 261 screen frames · 26 section-label text nodes · 1 stray instance.

Note on the keyword filter (Section 2): the requested keyword `Generate` was expanded to also match the `*Gen/` naming the design actually uses (`ProfileGen`, `CoverGen`, `OfferingTitle&DescriptionGen`) since those ARE the generation flows. `SignIn` screens are captured via their `Onboarding`/`Creator` path segments (the design names login screens `SignIn`, not `Login`/`Signup`).

## 1. Top-level screen catalog

### 1a. Unique screen names (de-duplicated)

Many screens exist as multiple artboard variations (interview steps, cart states, order states). This table collapses by name; the `# frames` column is how many artboards carry that name, `rep. node id` is the first occurrence. Full per-node list is in 1b.

| Screen name                                         | # frames | size      | rep. node id | flow-match |
| --------------------------------------------------- | -------- | --------- | ------------ | ---------- |
| `AddContact`                                        | 1        | 1512x1596 | `1953:56327` |            |
| `ChangeProfile/Changed`                             | 1        | 1512x982  | `1953:57103` | yes        |
| `ChangeProfile/Dropdown`                            | 1        | 1512x982  | `1953:57091` | yes        |
| `ChangeProfile/Main`                                | 1        | 1512x982  | `1953:57077` | yes        |
| `CoverGen/AfterGen`                                 | 1        | 1512x982  | `1488:51171` | yes        |
| `CoverGen/EditProfile`                              | 3        | 1512x982  | `1443:78638` | yes        |
| `CoverGen/Interview`                                | 23       | 1512x982  | `1443:78606` | yes        |
| `CoverGen/Interview/Generated`                      | 1        | 1512x982  | `1443:78627` | yes        |
| `CoverGen/Main`                                     | 1        | 1512x982  | `1487:79250` | yes        |
| `EditProfile/Creator/AddContact`                    | 1        | 1512x982  | `1953:56309` | yes        |
| `EditProfile/Creator/Main`                          | 3        | 1512x982  | `1953:56303` | yes        |
| `Help Email`                                        | 1        | 1280x793  | `1443:78522` | yes        |
| `Img/Post/Home`                                     | 2        | 1512x982  | `1675:78732` |            |
| `Member/Helpworder/HelpRequestSent`                 | 1        | 1512x982  | `1443:78509` |            |
| `Member/Helpworder/Profile`                         | 1        | 1512x982  | `1443:78492` | yes        |
| `Member/Helpworder/Profile/HelpRequest`             | 1        | 1512x982  | `1443:78497` | yes        |
| `Member/MemberProfile/EditProfile`                  | 1        | 1512x982  | `1443:78446` | yes        |
| `Member/MemberProfile/EditProfile/UploadProfile`    | 1        | 1512x982  | `1443:78450` | yes        |
| `Member/MemberProfile/Following/Empty`              | 1        | 1512x982  | `1443:78430` | yes        |
| `Member/MemberProfile/Following/Filled`             | 1        | 1512x982  | `1443:78434` | yes        |
| `Member/MemberProfile/Likes&Replies/Empty`          | 1        | 1512x982  | `1443:78422` | yes        |
| `Member/MemberProfile/Likes&Replies/Filled`         | 1        | 1512x982  | `1443:78426` | yes        |
| `Member/MemberProfile/More`                         | 1        | 1512x982  | `1443:78438` | yes        |
| `Member/MemberProfile/Posts/Empty`                  | 1        | 1512x982  | `1443:78414` | yes        |
| `Member/MemberProfile/Posts/Filled`                 | 1        | 1512x982  | `1443:78418` | yes        |
| `Member/MemberProfile/Purchases/Empty`              | 1        | 1512x982  | `1443:78405` | yes        |
| `Member/MemberProfile/Purchases/Filled`             | 1        | 1512x982  | `1443:78410` | yes        |
| `Member/MemberProfile/Weave`                        | 1        | 1512x982  | `1443:78454` | yes        |
| `Member/Onboarding`                                 | 1        | 1512x982  | `1443:78362` | yes        |
| `Member/Onboarding/Cart`                            | 13       | 1512x982  | `1443:78368` | yes        |
| `Member/Onboarding/CreateAccount/Email`             | 1        | 1512x982  | `1554:79566` | yes        |
| `Member/Onboarding/CreateAccount/EmailVerification` | 1        | 1512x982  | `1554:79568` | yes        |
| `Member/Onboarding/CreateAccount/Selection`         | 3        | 1512x982  | `1554:79508` | yes        |
| `Member/Onboarding/EmailVerification`               | 2        | 1512x982  | `1443:78375` | yes        |
| `Member/Onboarding/Home`                            | 1        | 1512x982  | `1443:78391` | yes        |
| `Member/Onboarding/SignIn`                          | 2        | 1512x982  | `1443:78371` | yes        |
| `Member/Onboarding/SignedIn`                        | 1        | 1512x982  | `1443:78365` | yes        |
| `Member/Order/Home`                                 | 14       | 1512x982  | `1443:78683` |            |
| `Member/Order/OrderCompleted`                       | 2        | 1512x982  | `1443:78850` |            |
| `Member/Posting/Home`                               | 6        | 1512x982  | `1623:63983` |            |
| `Member/Return/AfterReturnRequest`                  | 1        | 1512x982  | `1443:78904` |            |
| `Member/Return/Profile`                             | 1        | 1512x982  | `1443:78885` | yes        |
| `Member/Return/ReturnRequest`                       | 1        | 1512x982  | `1443:78892` |            |
| `Member/Return/ReturnRequestSent`                   | 1        | 1512x982  | `1443:78898` |            |
| `Member/Search/Home`                                | 6        | 1512x982  | `1443:78098` |            |
| `Member/Search/Result/Creators`                     | 1        | 1512x982  | `1443:78153` | yes        |
| `Member/Search/Result/Posts`                        | 1        | 1512x982  | `1443:78143` |            |
| `Member/Search/Result/Products`                     | 1        | 1512x982  | `1443:78123` |            |
| `Member/Search/Result/Services`                     | 1        | 1512x982  | `1443:78133` |            |
| `Member/TrackPackages/Profile`                      | 1        | 1512x982  | `1443:78461` | yes        |
| `Member/TrackPackages/TrackPackages`                | 1        | 1512x982  | `1443:78466` |            |
| `Member/TurntoCreator`                              | 2        | 1512x982  | `1443:78478` | yes        |
| `OfferingTitle&DescriptionGen/EditOffering`         | 2        | 1512x982  | `1443:78024` | yes        |
| `Onboarding/Creator/CreateAccount`                  | 3        | 1512x982  | `1526:78839` | yes        |
| `Onboarding/Creator/CreateAccount/EmailVerication`  | 2        | 1512x982  | `1526:79050` | yes        |
| `Onboarding/Creator/CreateAccount/Main`             | 3        | 1512x982  | `1443:78266` | yes        |
| `Onboarding/Creator/Interview`                      | 48       | 1512x982  | `1443:78282` | yes        |
| `Onboarding/Creator/Interview/Generated`            | 2        | 1512x982  | `1443:78331` | yes        |
| `Onboarding/Creator/Onboarded`                      | 1        | 1512x982  | `1443:78273` | yes        |
| `Onboarding/Creator/SignIn`                         | 2        | 1512x982  | `1463:71449` | yes        |
| `Onboarding/Creator/WhatBroughtYou?`                | 2        | 1512x982  | `1519:78312` | yes        |
| `Orders/Delivered`                                  | 1        | 1512x982  | `1443:77615` |            |
| `Orders/LabelCreated`                               | 2        | 1512x982  | `1443:77570` |            |
| `Orders/Orders`                                     | 4        | 1512x982  | `1443:77507` |            |
| `Orders/Packed`                                     | 2        | 1512x982  | `1443:77585` |            |
| `Orders/Return`                                     | 2        | 1512x982  | `1443:77630` |            |
| `Orders/Shipped`                                    | 2        | 1512x982  | `1443:77600` |            |
| `ProfileGen/AfterGen`                               | 1        | 1512x982  | `1443:78541` | yes        |
| `ProfileGen/EditProfile`                            | 3        | 1512x982  | `1496:61358` | yes        |
| `ProfileGen/Interview`                              | 34       | 1512x982  | `1443:78556` | yes        |
| `ProfileGen/Main`                                   | 1        | 1512x982  | `1443:78598` | yes        |
| `Publishing/AddaCard`                               | 1        | 1512x982  | `1492:56964` |            |
| `Publishing/AfterPublishing`                        | 2        | 1512x982  | `1492:57400` |            |
| `Publishing/EnteraCard`                             | 2        | 1512x982  | `1492:57073` |            |
| `Publishing/Main`                                   | 5        | 1512x982  | `1492:54764` |            |
| `Publishing/Option`                                 | 2        | 1512x982  | `1492:56746` |            |
| `Publishing/Published`                              | 1        | 1512x982  | `1492:57291` |            |
| `Publishing/SelectCard`                             | 1        | 1512x982  | `1492:57182` |            |
| `Services/Completed`                                | 1        | 1512x982  | `1443:77887` |            |
| `Services/InProgess`                                | 1        | 1512x982  | `1443:77866` |            |
| `Services/Requested`                                | 6        | 1512x982  | `1443:77824` |            |
| `Services/Scheduled`                                | 1        | 1512x982  | `1443:77846` |            |
| `Services/Upcoming`                                 | 1        | 1512x982  | `1443:77692` |            |

### 1b. Every top-level frame (full node inventory, document order)

| #   | node id      | name                                                | size      |
| --- | ------------ | --------------------------------------------------- | --------- |
| 1   | `1443:77507` | `Orders/Orders`                                     | 1512x982  |
| 2   | `1645:88739` | `Orders/Orders`                                     | 1512x982  |
| 3   | `1617:82505` | `Orders/Orders`                                     | 1512x982  |
| 4   | `1617:82719` | `Orders/Orders`                                     | 1512x982  |
| 5   | `1443:77570` | `Orders/LabelCreated`                               | 1512x982  |
| 6   | `1617:83313` | `Orders/LabelCreated`                               | 1512x982  |
| 7   | `1443:77585` | `Orders/Packed`                                     | 1512x982  |
| 8   | `1617:83567` | `Orders/Packed`                                     | 1512x982  |
| 9   | `1443:77600` | `Orders/Shipped`                                    | 1512x982  |
| 10  | `1645:89446` | `Orders/Shipped`                                    | 1512x982  |
| 11  | `1443:77615` | `Orders/Delivered`                                  | 1512x982  |
| 12  | `1443:77630` | `Orders/Return`                                     | 1512x982  |
| 13  | `1443:77692` | `Services/Upcoming`                                 | 1512x982  |
| 14  | `1443:77824` | `Services/Requested`                                | 1512x982  |
| 15  | `1618:87800` | `Services/Requested`                                | 1512x982  |
| 16  | `1618:88842` | `Services/Requested`                                | 1512x982  |
| 17  | `1618:89191` | `Services/Requested`                                | 1512x982  |
| 18  | `1618:89540` | `Services/Requested`                                | 1512x982  |
| 19  | `1618:86893` | `Services/Requested`                                | 1512x982  |
| 20  | `1443:77846` | `Services/Scheduled`                                | 1512x982  |
| 21  | `1443:77866` | `Services/InProgess`                                | 1512x982  |
| 22  | `1443:77887` | `Services/Completed`                                | 1512x982  |
| 23  | `1443:78024` | `OfferingTitle&DescriptionGen/EditOffering`         | 1512x982  |
| 24  | `1492:54274` | `OfferingTitle&DescriptionGen/EditOffering`         | 1512x982  |
| 25  | `1443:78098` | `Member/Search/Home`                                | 1512x982  |
| 26  | `1578:81875` | `Member/Search/Home`                                | 1512x982  |
| 27  | `1578:82335` | `Member/Search/Home`                                | 1512x982  |
| 28  | `1578:82687` | `Member/Search/Home`                                | 1512x982  |
| 29  | `1443:78110` | `Member/Search/Home`                                | 1512x982  |
| 30  | `1578:80121` | `Member/Search/Home`                                | 1512x982  |
| 31  | `1443:78123` | `Member/Search/Result/Products`                     | 1512x982  |
| 32  | `1443:78133` | `Member/Search/Result/Services`                     | 1512x982  |
| 33  | `1443:78143` | `Member/Search/Result/Posts`                        | 1512x982  |
| 34  | `1443:78153` | `Member/Search/Result/Creators`                     | 1512x982  |
| 35  | `1443:78266` | `Onboarding/Creator/CreateAccount/Main`             | 1512x982  |
| 36  | `1443:78273` | `Onboarding/Creator/Onboarded`                      | 1512x982  |
| 37  | `1443:78282` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 38  | `1465:87791` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 39  | `1443:78300` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 40  | `1443:78303` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 41  | `1465:88668` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 42  | `1465:88735` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 43  | `1465:91632` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 44  | `1468:76969` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 45  | `1468:77172` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 46  | `1468:77369` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 47  | `1468:77566` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 48  | `1468:76770` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 49  | `1468:76972` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 50  | `1468:77175` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 51  | `1468:77372` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 52  | `1468:77569` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 53  | `1468:76837` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 54  | `1468:76975` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 55  | `1468:77178` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 56  | `1468:77375` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 57  | `1468:77572` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 58  | `1443:78322` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 59  | `1465:87797` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 60  | `1465:88579` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 61  | `1443:78331` | `Onboarding/Creator/Interview/Generated`            | 1512x982  |
| 62  | `1465:87816` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 63  | `1526:78839` | `Onboarding/Creator/CreateAccount`                  | 1512x982  |
| 64  | `1526:79009` | `Onboarding/Creator/CreateAccount`                  | 1512x982  |
| 65  | `1526:79027` | `Onboarding/Creator/CreateAccount`                  | 1512x982  |
| 66  | `1526:79050` | `Onboarding/Creator/CreateAccount/EmailVerication`  | 1512x982  |
| 67  | `1526:79112` | `Onboarding/Creator/CreateAccount/EmailVerication`  | 1512x982  |
| 68  | `1463:71449` | `Onboarding/Creator/SignIn`                         | 1512x982  |
| 69  | `1526:79220` | `Onboarding/Creator/SignIn`                         | 1512x982  |
| 70  | `1443:78362` | `Member/Onboarding`                                 | 1512x982  |
| 71  | `1443:78365` | `Member/Onboarding/SignedIn`                        | 1512x982  |
| 72  | `1443:78368` | `Member/Onboarding/Cart`                            | 1512x982  |
| 73  | `1953:58157` | `Member/Onboarding/Cart`                            | 1512x982  |
| 74  | `1953:59388` | `Member/Onboarding/Cart`                            | 1512x982  |
| 75  | `1953:59610` | `Member/Onboarding/Cart`                            | 1512x982  |
| 76  | `1953:59820` | `Member/Onboarding/Cart`                            | 1512x982  |
| 77  | `1953:59999` | `Member/Onboarding/Cart`                            | 1512x982  |
| 78  | `1953:60178` | `Member/Onboarding/Cart`                            | 1512x982  |
| 79  | `1953:60357` | `Member/Onboarding/Cart`                            | 1512x982  |
| 80  | `1953:60536` | `Member/Onboarding/Cart`                            | 1512x982  |
| 81  | `1953:60715` | `Member/Onboarding/Cart`                            | 1512x982  |
| 82  | `1953:60894` | `Member/Onboarding/Cart`                            | 1512x982  |
| 83  | `1953:61073` | `Member/Onboarding/Cart`                            | 1512x982  |
| 84  | `1953:61252` | `Member/Onboarding/Cart`                            | 1512x982  |
| 85  | `1443:78371` | `Member/Onboarding/SignIn`                          | 1512x982  |
| 86  | `1553:78101` | `Member/Onboarding/SignIn`                          | 1512x982  |
| 87  | `1443:78375` | `Member/Onboarding/EmailVerification`               | 1512x982  |
| 88  | `1553:78290` | `Member/Onboarding/EmailVerification`               | 1512x982  |
| 89  | `1443:78391` | `Member/Onboarding/Home`                            | 1512x982  |
| 90  | `1443:78405` | `Member/MemberProfile/Purchases/Empty`              | 1512x982  |
| 91  | `1443:78410` | `Member/MemberProfile/Purchases/Filled`             | 1512x982  |
| 92  | `1443:78414` | `Member/MemberProfile/Posts/Empty`                  | 1512x982  |
| 93  | `1443:78418` | `Member/MemberProfile/Posts/Filled`                 | 1512x982  |
| 94  | `1443:78422` | `Member/MemberProfile/Likes&Replies/Empty`          | 1512x982  |
| 95  | `1443:78426` | `Member/MemberProfile/Likes&Replies/Filled`         | 1512x982  |
| 96  | `1443:78430` | `Member/MemberProfile/Following/Empty`              | 1512x982  |
| 97  | `1443:78434` | `Member/MemberProfile/Following/Filled`             | 1512x982  |
| 98  | `1443:78438` | `Member/MemberProfile/More`                         | 1512x982  |
| 99  | `1443:78446` | `Member/MemberProfile/EditProfile`                  | 1512x982  |
| 100 | `1443:78450` | `Member/MemberProfile/EditProfile/UploadProfile`    | 1512x982  |
| 101 | `1443:78454` | `Member/MemberProfile/Weave`                        | 1512x982  |
| 102 | `1443:78461` | `Member/TrackPackages/Profile`                      | 1512x982  |
| 103 | `1443:78466` | `Member/TrackPackages/TrackPackages`                | 1512x982  |
| 104 | `1443:78478` | `Member/TurntoCreator`                              | 1512x982  |
| 105 | `1443:78484` | `Member/TurntoCreator`                              | 1512x982  |
| 106 | `1443:78492` | `Member/Helpworder/Profile`                         | 1512x982  |
| 107 | `1443:78497` | `Member/Helpworder/Profile/HelpRequest`             | 1512x982  |
| 108 | `1443:78509` | `Member/Helpworder/HelpRequestSent`                 | 1512x982  |
| 109 | `1443:78522` | `Help Email`                                        | 1280x793  |
| 110 | `1443:78541` | `ProfileGen/AfterGen`                               | 1512x982  |
| 111 | `1488:51171` | `CoverGen/AfterGen`                                 | 1512x982  |
| 112 | `1492:54764` | `Publishing/Main`                                   | 1512x982  |
| 113 | `1492:56637` | `Publishing/Main`                                   | 1512x982  |
| 114 | `1578:83182` | `Publishing/Main`                                   | 1512x982  |
| 115 | `1578:83288` | `Publishing/Main`                                   | 1512x982  |
| 116 | `1578:84952` | `Publishing/Main`                                   | 1512x982  |
| 117 | `1492:56746` | `Publishing/Option`                                 | 1512x982  |
| 118 | `1492:56855` | `Publishing/Option`                                 | 1512x982  |
| 119 | `1492:56964` | `Publishing/AddaCard`                               | 1512x982  |
| 120 | `1492:57073` | `Publishing/EnteraCard`                             | 1512x982  |
| 121 | `1549:80168` | `Publishing/EnteraCard`                             | 1512x982  |
| 122 | `1492:57182` | `Publishing/SelectCard`                             | 1512x982  |
| 123 | `1492:57291` | `Publishing/Published`                              | 1512x982  |
| 124 | `1492:57400` | `Publishing/AfterPublishing`                        | 1512x982  |
| 125 | `1645:88632` | `Publishing/AfterPublishing`                        | 1512x982  |
| 126 | `1443:78556` | `ProfileGen/Interview`                              | 1512x982  |
| 127 | `1545:49540` | `ProfileGen/Interview`                              | 1512x982  |
| 128 | `1486:82796` | `ProfileGen/Interview`                              | 1512x982  |
| 129 | `1486:82876` | `ProfileGen/Interview`                              | 1512x982  |
| 130 | `1485:48421` | `ProfileGen/Interview`                              | 1512x982  |
| 131 | `1556:79716` | `ProfileGen/Interview`                              | 1512x982  |
| 132 | `1485:48584` | `ProfileGen/Interview`                              | 1512x982  |
| 133 | `1443:78559` | `ProfileGen/Interview`                              | 1512x982  |
| 134 | `1545:49978` | `ProfileGen/Interview`                              | 1512x982  |
| 135 | `1486:83053` | `ProfileGen/Interview`                              | 1512x982  |
| 136 | `1545:49626` | `ProfileGen/Interview`                              | 1512x982  |
| 137 | `1487:38212` | `ProfileGen/Interview`                              | 1512x982  |
| 138 | `1545:49712` | `ProfileGen/Interview`                              | 1512x982  |
| 139 | `1487:38358` | `ProfileGen/Interview`                              | 1512x982  |
| 140 | `1545:49798` | `ProfileGen/Interview`                              | 1512x982  |
| 141 | `1487:38504` | `ProfileGen/Interview`                              | 1512x982  |
| 142 | `1487:38653` | `ProfileGen/Interview`                              | 1512x982  |
| 143 | `1487:49117` | `ProfileGen/Interview`                              | 1512x982  |
| 144 | `1487:49182` | `ProfileGen/Interview`                              | 1512x982  |
| 145 | `1488:50933` | `ProfileGen/Interview`                              | 1512x982  |
| 146 | `1487:79031` | `ProfileGen/Interview`                              | 1512x982  |
| 147 | `1487:38718` | `ProfileGen/Interview`                              | 1512x982  |
| 148 | `1487:49052` | `ProfileGen/Interview`                              | 1512x982  |
| 149 | `1486:83056` | `ProfileGen/Interview`                              | 1512x982  |
| 150 | `1486:82970` | `ProfileGen/Interview`                              | 1512x982  |
| 151 | `1487:38215` | `ProfileGen/Interview`                              | 1512x982  |
| 152 | `1487:38361` | `ProfileGen/Interview`                              | 1512x982  |
| 153 | `1443:78562` | `ProfileGen/Interview`                              | 1512x982  |
| 154 | `1545:49884` | `ProfileGen/Interview`                              | 1512x982  |
| 155 | `1488:50705` | `ProfileGen/Interview`                              | 1512x982  |
| 156 | `1549:79226` | `ProfileGen/Interview`                              | 1512x982  |
| 157 | `1443:78598` | `ProfileGen/Main`                                   | 1512x982  |
| 158 | `1443:78606` | `CoverGen/Interview`                                | 1512x982  |
| 159 | `1549:79742` | `CoverGen/Interview`                                | 1512x982  |
| 160 | `1488:43975` | `CoverGen/Interview`                                | 1512x982  |
| 161 | `1549:79656` | `CoverGen/Interview`                                | 1512x982  |
| 162 | `1488:44127` | `CoverGen/Interview`                                | 1512x982  |
| 163 | `1549:79570` | `CoverGen/Interview`                                | 1512x982  |
| 164 | `1488:49941` | `CoverGen/Interview`                                | 1512x982  |
| 165 | `1549:79484` | `CoverGen/Interview`                                | 1512x982  |
| 166 | `1488:50096` | `CoverGen/Interview`                                | 1512x982  |
| 167 | `1549:79398` | `CoverGen/Interview`                                | 1512x982  |
| 168 | `1488:50251` | `CoverGen/Interview`                                | 1512x982  |
| 169 | `1549:79312` | `CoverGen/Interview`                                | 1512x982  |
| 170 | `1488:50406` | `CoverGen/Interview`                                | 1512x982  |
| 171 | `1488:50563` | `CoverGen/Interview`                                | 1512x982  |
| 172 | `1488:43890` | `CoverGen/Interview`                                | 1512x982  |
| 173 | `1549:79159` | `CoverGen/Interview`                                | 1512x982  |
| 174 | `1488:43978` | `CoverGen/Interview`                                | 1512x982  |
| 175 | `1488:44130` | `CoverGen/Interview`                                | 1512x982  |
| 176 | `1488:50099` | `CoverGen/Interview`                                | 1512x982  |
| 177 | `1488:49944` | `CoverGen/Interview`                                | 1512x982  |
| 178 | `1488:50254` | `CoverGen/Interview`                                | 1512x982  |
| 179 | `1488:50409` | `CoverGen/Interview`                                | 1512x982  |
| 180 | `1488:50789` | `CoverGen/Interview`                                | 1512x982  |
| 181 | `1443:78627` | `CoverGen/Interview/Generated`                      | 1512x982  |
| 182 | `1443:78638` | `CoverGen/EditProfile`                              | 1512x982  |
| 183 | `1496:61358` | `ProfileGen/EditProfile`                            | 1512x982  |
| 184 | `1496:61872` | `ProfileGen/EditProfile`                            | 1512x982  |
| 185 | `1496:61696` | `ProfileGen/EditProfile`                            | 1512x982  |
| 186 | `1487:79657` | `CoverGen/EditProfile`                              | 1512x982  |
| 187 | `1643:87152` | `CoverGen/EditProfile`                              | 1512x982  |
| 188 | `1443:78683` | `Member/Order/Home`                                 | 1512x982  |
| 189 | `1623:63983` | `Member/Posting/Home`                               | 1512x982  |
| 190 | `1623:64466` | `Member/Posting/Home`                               | 1512x982  |
| 191 | `1623:64719` | `Member/Posting/Home`                               | 1512x982  |
| 192 | `1623:64972` | `Member/Posting/Home`                               | 1512x982  |
| 193 | `1623:65225` | `Member/Posting/Home`                               | 1512x982  |
| 194 | `1623:65478` | `Member/Posting/Home`                               | 1512x982  |
| 195 | `1623:59054` | `Member/Order/Home`                                 | 1512x982  |
| 196 | `1623:59385` | `Member/Order/Home`                                 | 1512x982  |
| 197 | `1623:59706` | `Member/Order/Home`                                 | 1512x982  |
| 198 | `1623:60025` | `Member/Order/Home`                                 | 1512x982  |
| 199 | `1623:60344` | `Member/Order/Home`                                 | 1512x982  |
| 200 | `1623:60663` | `Member/Order/Home`                                 | 1512x982  |
| 201 | `1623:60982` | `Member/Order/Home`                                 | 1512x982  |
| 202 | `1623:61301` | `Member/Order/Home`                                 | 1512x982  |
| 203 | `1623:61620` | `Member/Order/Home`                                 | 1512x982  |
| 204 | `1623:61939` | `Member/Order/Home`                                 | 1512x982  |
| 205 | `1623:62577` | `Member/Order/Home`                                 | 1512x982  |
| 206 | `1623:62258` | `Member/Order/Home`                                 | 1512x982  |
| 207 | `1623:62588` | `Member/Order/Home`                                 | 1512x982  |
| 208 | `1443:78850` | `Member/Order/OrderCompleted`                       | 1512x982  |
| 209 | `1953:59186` | `Member/Order/OrderCompleted`                       | 1512x982  |
| 210 | `1443:78885` | `Member/Return/Profile`                             | 1512x982  |
| 211 | `1443:78892` | `Member/Return/ReturnRequest`                       | 1512x982  |
| 212 | `1443:78898` | `Member/Return/ReturnRequestSent`                   | 1512x982  |
| 213 | `1443:78904` | `Member/Return/AfterReturnRequest`                  | 1512x982  |
| 214 | `1443:78909` | `Orders/Return`                                     | 1512x982  |
| 215 | `1473:81531` | `Onboarding/Creator/CreateAccount/Main`             | 1512x982  |
| 216 | `1556:79828` | `Onboarding/Creator/CreateAccount/Main`             | 1512x982  |
| 217 | `1473:81547` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 218 | `1473:81550` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 219 | `1474:84342` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 220 | `1473:81553` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 221 | `1473:81556` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 222 | `1473:81559` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 223 | `1473:81562` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 224 | `1473:81565` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 225 | `1473:81568` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 226 | `1473:81571` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 227 | `1473:81574` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 228 | `1485:48994` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 229 | `1473:81580` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 230 | `1473:81583` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 231 | `1473:81586` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 232 | `1473:81589` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 233 | `1485:48997` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 234 | `1473:81595` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 235 | `1473:81598` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 236 | `1473:81601` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 237 | `1473:81604` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 238 | `1485:49000` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 239 | `1473:81619` | `Onboarding/Creator/Interview`                      | 1512x982  |
| 240 | `1473:81622` | `Onboarding/Creator/Interview/Generated`            | 1512x982  |
| 241 | `1486:82653` | `ProfileGen/Interview`                              | 1512x982  |
| 242 | `1532:80370` | `ProfileGen/Interview`                              | 1512x982  |
| 243 | `1486:82657` | `ProfileGen/Interview`                              | 1512x982  |
| 244 | `1487:79250` | `CoverGen/Main`                                     | 1512x982  |
| 245 | `1519:78312` | `Onboarding/Creator/WhatBroughtYou?`                | 1512x982  |
| 246 | `1526:78557` | `Onboarding/Creator/WhatBroughtYou?`                | 1512x982  |
| 247 | `1554:79508` | `Member/Onboarding/CreateAccount/Selection`         | 1512x982  |
| 248 | `1554:79520` | `Member/Onboarding/CreateAccount/Selection`         | 1512x982  |
| 249 | `1554:79549` | `Member/Onboarding/CreateAccount/Selection`         | 1512x982  |
| 250 | `1554:79566` | `Member/Onboarding/CreateAccount/Email`             | 1512x982  |
| 251 | `1554:79568` | `Member/Onboarding/CreateAccount/EmailVerification` | 1512x982  |
| 252 | `1675:78732` | `Img/Post/Home`                                     | 1512x982  |
| 253 | `1675:84805` | `Img/Post/Home`                                     | 1512x982  |
| 254 | `1953:56303` | `EditProfile/Creator/Main`                          | 1512x982  |
| 255 | `1953:56309` | `EditProfile/Creator/AddContact`                    | 1512x982  |
| 256 | `1953:56317` | `EditProfile/Creator/Main`                          | 1512x982  |
| 257 | `1953:56322` | `EditProfile/Creator/Main`                          | 1512x982  |
| 258 | `1953:56327` | `AddContact`                                        | 1512x1596 |
| 259 | `1953:57077` | `ChangeProfile/Main`                                | 1512x982  |
| 260 | `1953:57091` | `ChangeProfile/Dropdown`                            | 1512x982  |
| 261 | `1953:57103` | `ChangeProfile/Changed`                             | 1512x982  |

Section-label text nodes on the page (group headers, not screens):

| node id      | label                  | @x,y        |
| ------------ | ---------------------- | ----------- |
| `1443:77506` | Order Management       | 0,24750     |
| `1443:77691` | Service Management     | 0,27282     |
| `1443:77909` | Publishing             | 0,22207     |
| `1443:78019` | Edit Offering          | 0,19675     |
| `1443:78097` | Member/Search          | -94,57553   |
| `1443:78172` | Member/Posting         | -94,59722   |
| `1443:78263` | Onboarding/Creator     | 0,2965      |
| `1443:78264` | Creators               | 0,707       |
| `1443:78265` | Members                | -94,34578   |
| `1443:78361` | Member/Onboarding      | -94,36487   |
| `1953:58156` | Member/Order           | -94,39945   |
| `1443:78404` | Member/Profile         | -94,42709   |
| `1443:78460` | Members/Track Packages | -118,49605  |
| `1443:78477` | Member/Turn to creator | -94,52001   |
| `1443:78491` | Member/Help with Order | -118,47760  |
| `1443:78540` | Profile Gen            | 0,6946      |
| `1443:78605` | Cover Gen              | 0,10338     |
| `1443:78668` | Member/Order           | -142,54942  |
| `1443:78884` | Member/Return          | -94,45915   |
| `1485:49496` | 10%/transaction        | 44926,53214 |
| `1485:49487` | 10%/transaction        | 45266,53242 |
| `1614:85762` | \*                     | -687,18970  |
| `1953:56302` | Add Contact            | 69,14452    |
| `1953:56316` | Edit Profile/Creator   | 61,12626    |
| `1953:56326` | Add Contacts           | 61,16311    |
| `1953:57076` | Change Profile         | -94,61954   |

Stray non-frame direct child: `1443:78490` `Checkbox` (24x24).

## 2. Flow frames (keyword-matched) with one-level composition

Grouped by flow. For each unique screen: size, frame count, every node id, and the immediate children (name / id / width) of the representative artboard.

**Key structural fact:** on the conversational screens (`*/Interview`, `*/Interview/Generated`) the interview/chat UI is encapsulated inside a single `Weave/Sidebar` instance rendered at **~1432px wide (expanded)**, plus an 80px `Navigation/SideBar`. On non-conversational screens the same `Weave/Sidebar` component appears as a **40px collapsed rail** (occasionally 333px half-open). So the real interview composition (message list / composer / buttons) lives one level deeper than metadata exposes here — inside that expanded `Weave/Sidebar` instance.

### A. Creator Onboarding (Signup -> Verify -> Interview)

#### `Onboarding/Creator/CreateAccount/Main` — 3 frame(s), 1512x982

Node ids: `1443:78266`, `1473:81531`, `1556:79828`

Immediate children of representative `1443:78266`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Rectangle 34624283` | `1443:78267` | 1     |
| `Main`               | `1443:78268` | 1392  |
| `Navigation/SideBar` | `1443:78271` | 80    |
| `Weave/Sidebar`      | `1443:78272` | 40    |

#### `Onboarding/Creator/Onboarded` — 1 frame(s), 1512x982

Node ids: `1443:78273`

Immediate children of representative `1443:78273`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Contact`            | `1443:78274` | 81    |
| `Button/Square`      | `1443:78275` | 40    |
| `Main`               | `1443:78277` | 1392  |
| `Navigation/SideBar` | `1443:78280` | 80    |
| `Weave/Sidebar`      | `1443:78281` | 333   |

#### `Onboarding/Creator/Interview` — 48 frame(s), 1512x982

Node ids: `1443:78282`, `1465:87791`, `1443:78300`, `1443:78303`, `1465:88668`, `1465:88735`, `1465:91632`, `1468:76969`, `1468:77172`, `1468:77369`, `1468:77566`, `1468:76770`, `1468:76972`, `1468:77175`, `1468:77372`, `1468:77569`, `1468:76837`, `1468:76975`, `1468:77178`, `1468:77375`, `1468:77572`, `1443:78322`, `1465:87797`, `1465:88579`, `1465:87816`, `1473:81547`, `1473:81550`, `1474:84342`, `1473:81553`, `1473:81556`, `1473:81559`, `1473:81562`, `1473:81565`, `1473:81568`, `1473:81571`, `1473:81574`, `1485:48994`, `1473:81580`, `1473:81583`, `1473:81586`, `1473:81589`, `1485:48997`, `1473:81595`, `1473:81598`, `1473:81601`, `1473:81604`, `1485:49000`, `1473:81619`

Immediate children of representative `1443:78282`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Weave/Sidebar`      | `1443:78283` | 1432  |
| `Navigation/SideBar` | `1443:78284` | 80    |

#### `Onboarding/Creator/Interview/Generated` — 2 frame(s), 1512x982

Node ids: `1443:78331`, `1473:81622`

Immediate children of representative `1443:78331`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Email Address`      | `1443:78332` | 626   |
| `Email Address`      | `1443:78333` | 626   |
| `Navigation/SideBar` | `1443:78334` | 80    |
| `Weave/Sidebar`      | `1443:78335` | 1432  |

#### `Onboarding/Creator/CreateAccount` — 3 frame(s), 1512x982

Node ids: `1526:78839`, `1526:79009`, `1526:79027`

Immediate children of representative `1526:78839`:

| child name      | child id     | width |
| --------------- | ------------ | ----- |
| `CreateAccount` | `1526:78989` | 500   |

#### `Onboarding/Creator/CreateAccount/EmailVerication` — 2 frame(s), 1512x982

Node ids: `1526:79050`, `1526:79112`

Immediate children of representative `1526:79050`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Divider/Horizontal` | `1526:79087` | 461   |
| `Frame 1000002723`   | `1526:79109` | 400   |

#### `Onboarding/Creator/SignIn` — 2 frame(s), 1512x982

Node ids: `1463:71449`, `1526:79220`

Immediate children of representative `1463:71449`:

| child name | child id     | width |
| ---------- | ------------ | ----- |
| `Main`     | `1463:71450` | 1392  |
| `SideBar`  | `1463:71454` | 120   |

#### `Onboarding/Creator/WhatBroughtYou?` — 2 frame(s), 1512x982

Node ids: `1519:78312`, `1526:78557`

Immediate children of representative `1519:78312`:

| child name         | child id     | width |
| ------------------ | ------------ | ----- |
| `Text`             | `1519:78313` | 335   |
| `Frame 1000002714` | `1519:78318` | 500   |

### B. ProfileGen

#### `ProfileGen/AfterGen` — 1 frame(s), 1512x982

Node ids: `1443:78541`

Immediate children of representative `1443:78541`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Navigation/SideBar` | `1443:78542` | 80    |
| `Main`               | `1443:78544` | 1392  |
| `Weave/Sidebar`      | `1443:78543` | 40    |

#### `ProfileGen/Interview` — 34 frame(s), 1512x982

Node ids: `1443:78556`, `1545:49540`, `1486:82796`, `1486:82876`, `1485:48421`, `1556:79716`, `1485:48584`, `1443:78559`, `1545:49978`, `1486:83053`, `1545:49626`, `1487:38212`, `1545:49712`, `1487:38358`, `1545:49798`, `1487:38504`, `1487:38653`, `1487:49117`, `1487:49182`, `1488:50933`, `1487:79031`, `1487:38718`, `1487:49052`, `1486:83056`, `1486:82970`, `1487:38215`, `1487:38361`, `1443:78562`, `1545:49884`, `1488:50705`, `1549:79226`, `1486:82653`, `1532:80370`, `1486:82657`

Immediate children of representative `1443:78556`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Navigation/SideBar` | `1443:78557` | 80    |
| `Weave/Sidebar`      | `1443:78558` | 1432  |

#### `ProfileGen/Main` — 1 frame(s), 1512x982

Node ids: `1443:78598`

Immediate children of representative `1443:78598`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Rectangle 34624283` | `1443:78599` | 1     |
| `Main`               | `1443:78600` | 1392  |
| `Navigation/SideBar` | `1443:78603` | 80    |
| `Weave/Sidebar`      | `1443:78604` | 40    |

#### `ProfileGen/EditProfile` — 3 frame(s), 1512x982

Node ids: `1496:61358`, `1496:61872`, `1496:61696`

Immediate children of representative `1496:61358`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Rectangle 34624283` | `1496:61359` | 1     |
| `Main`               | `1496:61361` | 1391  |
| `Navigation/SideBar` | `1496:61363` | 80    |
| `Weave/Sidebar`      | `1496:61360` | 40    |

### C. CoverGen (cover-image generation)

#### `CoverGen/AfterGen` — 1 frame(s), 1512x982

Node ids: `1488:51171`

Immediate children of representative `1488:51171`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Main`               | `1488:51174` | 1392  |
| `Navigation/SideBar` | `1492:87187` | 80    |
| `Weave/Sidebar`      | `1488:51173` | 40    |

#### `CoverGen/Interview` — 23 frame(s), 1512x982

Node ids: `1443:78606`, `1549:79742`, `1488:43975`, `1549:79656`, `1488:44127`, `1549:79570`, `1488:49941`, `1549:79484`, `1488:50096`, `1549:79398`, `1488:50251`, `1549:79312`, `1488:50406`, `1488:50563`, `1488:43890`, `1549:79159`, `1488:43978`, `1488:44130`, `1488:50099`, `1488:49944`, `1488:50254`, `1488:50409`, `1488:50789`

Immediate children of representative `1443:78606`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Weave/Sidebar`      | `1443:78608` | 1432  |
| `Navigation/SideBar` | `1492:87191` | 80    |

#### `CoverGen/Interview/Generated` — 1 frame(s), 1512x982

Node ids: `1443:78627`

Immediate children of representative `1443:78627`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Weave/Sidebar`      | `1443:78629` | 1432  |
| `Navigation/SideBar` | `1492:87205` | 80    |

#### `CoverGen/EditProfile` — 3 frame(s), 1512x982

Node ids: `1443:78638`, `1487:79657`, `1643:87152`

Immediate children of representative `1443:78638`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Rectangle 34624283` | `1443:78639` | 1     |
| `Main`               | `1443:78642` | 1391  |
| `Navigation/SideBar` | `1492:87193` | 80    |
| `Weave/Sidebar`      | `1443:78641` | 40    |

#### `CoverGen/Main` — 1 frame(s), 1512x982

Node ids: `1487:79250`

Immediate children of representative `1487:79250`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Main`               | `1487:79253` | 1392  |
| `Navigation/SideBar` | `1492:87211` | 80    |
| `Weave/Sidebar`      | `1487:79252` | 40    |

### D. Creator profile / offering edit

#### `OfferingTitle&DescriptionGen/EditOffering` — 2 frame(s), 1512x982

Node ids: `1443:78024`, `1492:54274`

Immediate children of representative `1443:78024`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Page/EditOffering`  | `1443:78027` | 1391  |
| `Navigation/SideBar` | `1492:87837` | 80    |
| `Weave/Sidebar`      | `1443:78026` | 40    |

#### `EditProfile/Creator/Main` — 3 frame(s), 1512x982

Node ids: `1953:56303`, `1953:56317`, `1953:56322`

Immediate children of representative `1953:56303`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Main`               | `1953:56304` | 1392  |
| `Navigation/SideBar` | `1953:56307` | 80    |
| `Weave/Sidebar`      | `1953:56308` | 40    |

#### `EditProfile/Creator/AddContact` — 1 frame(s), 1512x982

Node ids: `1953:56309`

Immediate children of representative `1953:56309`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Main`               | `1953:56310` | 1392  |
| `Navigation/SideBar` | `1953:56314` | 80    |
| `Weave/Sidebar`      | `1953:56315` | 40    |

#### `ChangeProfile/Main` — 1 frame(s), 1512x982

Node ids: `1953:57077`

Immediate children of representative `1953:57077`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Frame 1000002337`   | `1953:57078` | 1392  |
| `Navigation/SideBar` | `1953:57089` | 80    |
| `Weave/Sidebar`      | `1953:57090` | 40    |

#### `ChangeProfile/Dropdown` — 1 frame(s), 1512x982

Node ids: `1953:57091`

Immediate children of representative `1953:57091`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Frame 1000002337`   | `1953:57092` | 1392  |
| `Navigation/SideBar` | `1953:57101` | 80    |
| `Weave/Sidebar`      | `1953:57102` | 40    |

#### `ChangeProfile/Changed` — 1 frame(s), 1512x982

Node ids: `1953:57103`

Immediate children of representative `1953:57103`:

| child name           | child id     | width |
| -------------------- | ------------ | ----- |
| `Frame 1000002337`   | `1953:57104` | 1392  |
| `Navigation/SideBar` | `1953:57113` | 80    |
| `Weave/Sidebar`      | `1953:57114` | 40    |

### E. Member flow (secondary keyword matches)

#### `Member/Search/Result/Creators` — 1 frame(s), 1512x982

Node ids: `1443:78153`

Immediate children of representative `1443:78153`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Sidebar/Customer/MVP` | `1443:78154` | 80    |
| `Main`                 | `1443:78156` | 1392  |
| `Weave/Sidebar`        | `1443:78155` | 40    |

#### `Member/Onboarding` — 1 frame(s), 1512x982

Node ids: `1443:78362`

Immediate children of representative `1443:78362`:

| child name                  | child id     | width |
| --------------------------- | ------------ | ----- |
| `SideBar`                   | `1443:78364` | 120   |
| `CreatorProfile/MemberView` | `1443:78363` | 1360  |

#### `Member/Onboarding/SignedIn` — 1 frame(s), 1512x982

Node ids: `1443:78365`

Immediate children of representative `1443:78365`:

| child name                  | child id     | width |
| --------------------------- | ------------ | ----- |
| `CreatorProfile/MemberView` | `1443:78366` | 1360  |
| `SideBar`                   | `1443:78367` | 120   |

#### `Member/Onboarding/Cart` — 13 frame(s), 1512x982

Node ids: `1443:78368`, `1953:58157`, `1953:59388`, `1953:59610`, `1953:59820`, `1953:59999`, `1953:60178`, `1953:60357`, `1953:60536`, `1953:60715`, `1953:60894`, `1953:61073`, `1953:61252`

Immediate children of representative `1443:78368`:

| child name                  | child id     | width |
| --------------------------- | ------------ | ----- |
| `CreatorProfile/MemberView` | `1443:78369` | 1360  |
| `SideBar`                   | `1443:78370` | 120   |

#### `Member/Onboarding/SignIn` — 2 frame(s), 1512x982

Node ids: `1443:78371`, `1553:78101`

Immediate children of representative `1443:78371`:

| child name                  | child id     | width |
| --------------------------- | ------------ | ----- |
| `CreatorProfile/MemberView` | `1443:78372` | 1360  |
| `Modal/SignIn`              | `1443:78374` | 1395  |
| `SideBar`                   | `1443:78373` | 120   |

#### `Member/Onboarding/EmailVerification` — 2 frame(s), 1512x982

Node ids: `1443:78375`, `1553:78290`

Immediate children of representative `1443:78375`:

| child name                  | child id     | width |
| --------------------------- | ------------ | ----- |
| `CreatorProfile/MemberView` | `1443:78376` | 1360  |
| `SideBar`                   | `1443:78377` | 120   |
| `Modal/EmailVerification`   | `1443:78378` | 1395  |

#### `Member/Onboarding/Home` — 1 frame(s), 1512x982

Node ids: `1443:78391`

Immediate children of representative `1443:78391`:

| child name         | child id     | width |
| ------------------ | ------------ | ----- |
| `Frame 1000002337` | `1443:78392` | 1392  |
| `SideBar`          | `1443:78399` | 120   |

#### `Member/MemberProfile/Purchases/Empty` — 1 frame(s), 1512x982

Node ids: `1443:78405`

Immediate children of representative `1443:78405`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78406` | 1392  |
| `Rectangle 34624283`   | `1443:78407` | 1     |
| `Sidebar/Customer/MVP` | `1443:78408` | 80    |
| `Weave/Sidebar`        | `1443:78409` | 40    |

#### `Member/MemberProfile/Purchases/Filled` — 1 frame(s), 1512x982

Node ids: `1443:78410`

Immediate children of representative `1443:78410`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78411` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78412` | 80    |
| `Weave/Sidebar`        | `1443:78413` | 40    |

#### `Member/MemberProfile/Posts/Empty` — 1 frame(s), 1512x982

Node ids: `1443:78414`

Immediate children of representative `1443:78414`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78415` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78416` | 80    |
| `Weave/Sidebar`        | `1443:78417` | 40    |

#### `Member/MemberProfile/Posts/Filled` — 1 frame(s), 1512x982

Node ids: `1443:78418`

Immediate children of representative `1443:78418`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78419` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78420` | 80    |
| `Weave/Sidebar`        | `1443:78421` | 40    |

#### `Member/MemberProfile/Likes&Replies/Empty` — 1 frame(s), 1512x982

Node ids: `1443:78422`

Immediate children of representative `1443:78422`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78423` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78424` | 80    |
| `Weave/Sidebar`        | `1443:78425` | 40    |

#### `Member/MemberProfile/Likes&Replies/Filled` — 1 frame(s), 1512x982

Node ids: `1443:78426`

Immediate children of representative `1443:78426`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78427` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78428` | 80    |
| `Weave/Sidebar`        | `1443:78429` | 40    |

#### `Member/MemberProfile/Following/Empty` — 1 frame(s), 1512x982

Node ids: `1443:78430`

Immediate children of representative `1443:78430`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78431` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78432` | 80    |
| `Weave/Sidebar`        | `1443:78433` | 40    |

#### `Member/MemberProfile/Following/Filled` — 1 frame(s), 1512x982

Node ids: `1443:78434`

Immediate children of representative `1443:78434`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78435` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78436` | 80    |
| `Weave/Sidebar`        | `1443:78437` | 40    |

#### `Member/MemberProfile/More` — 1 frame(s), 1512x982

Node ids: `1443:78438`

Immediate children of representative `1443:78438`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Frame 1000002337`     | `1443:78439` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78444` | 80    |
| `Weave/Sidebar`        | `1443:78445` | 40    |

#### `Member/MemberProfile/EditProfile` — 1 frame(s), 1512x982

Node ids: `1443:78446`

Immediate children of representative `1443:78446`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/EditProfile`     | `1443:78447` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78448` | 80    |
| `Weave/Sidebar`        | `1443:78449` | 40    |

#### `Member/MemberProfile/EditProfile/UploadProfile` — 1 frame(s), 1512x982

Node ids: `1443:78450`

Immediate children of representative `1443:78450`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/EditProfile`     | `1443:78451` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78452` | 80    |
| `Weave/Sidebar`        | `1443:78453` | 40    |

#### `Member/MemberProfile/Weave` — 1 frame(s), 1512x982

Node ids: `1443:78454`

Immediate children of representative `1443:78454`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/EditProfile`     | `1443:78455` | 1392  |
| `Frame 1000002337`     | `1443:78456` | 1392  |
| `Weave/Sidebar`        | `1443:78458` | 333   |
| `Sidebar/Customer/MVP` | `1443:78459` | 80    |

#### `Member/TrackPackages/Profile` — 1 frame(s), 1512x982

Node ids: `1443:78461`

Immediate children of representative `1443:78461`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78462` | 1392  |
| `Rectangle 34624283`   | `1443:78463` | 1     |
| `Sidebar/Customer/MVP` | `1443:78464` | 80    |
| `Weave/Sidebar`        | `1443:78465` | 40    |

#### `Member/TurntoCreator` — 2 frame(s), 1512x982

Node ids: `1443:78478`, `1443:78484`

Immediate children of representative `1443:78478`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Frame 1000002337`     | `1443:78479` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78482` | 80    |
| `Weave/Sidebar`        | `1443:78483` | 40    |

#### `Member/Helpworder/Profile` — 1 frame(s), 1512x982

Node ids: `1443:78492`

Immediate children of representative `1443:78492`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Page/Profile/Member`  | `1443:78493` | 1392  |
| `Rectangle 34624283`   | `1443:78494` | 1     |
| `Sidebar/Customer/MVP` | `1443:78495` | 80    |
| `Weave/Sidebar`        | `1443:78496` | 40    |

#### `Member/Helpworder/Profile/HelpRequest` — 1 frame(s), 1512x982

Node ids: `1443:78497`

Immediate children of representative `1443:78497`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Frame 1000002337`     | `1443:78498` | 1392  |
| `Modal/HelpRequest`    | `1443:78505` | 1395  |
| `Rectangle 34624283`   | `1443:78506` | 1     |
| `Sidebar/Customer/MVP` | `1443:78507` | 80    |
| `Weave/Sidebar`        | `1443:78508` | 40    |

#### `Member/Return/Profile` — 1 frame(s), 1512x982

Node ids: `1443:78885`

Immediate children of representative `1443:78885`:

| child name             | child id     | width |
| ---------------------- | ------------ | ----- |
| `Rectangle 34624283`   | `1443:78886` | 1     |
| `Backdrop/Folded`      | `1443:78887` | 40    |
| `Rectangle 34624284`   | `1443:78888` | 1     |
| `Page/Profile/Member`  | `1443:78889` | 1392  |
| `Sidebar/Customer/MVP` | `1443:78890` | 80    |
| `Weave/Sidebar`        | `1443:78891` | 40    |

#### `Member/Onboarding/CreateAccount/Selection` — 3 frame(s), 1512x982

Node ids: `1554:79508`, `1554:79520`, `1554:79549`

Immediate children of representative `1554:79508`:

| child name         | child id     | width |
| ------------------ | ------------ | ----- |
| `Text`             | `1554:79509` | 335   |
| `Frame 1000002714` | `1554:79514` | 500   |

#### `Member/Onboarding/CreateAccount/Email` — 1 frame(s), 1512x982

Node ids: `1554:79566`

Immediate children of representative `1554:79566`:

| child name      | child id     | width |
| --------------- | ------------ | ----- |
| `Dialog/SignIn` | `1554:79567` | 580   |

#### `Member/Onboarding/CreateAccount/EmailVerification` — 1 frame(s), 1512x982

Node ids: `1554:79568`

Immediate children of representative `1554:79568`:

| child name      | child id     | width |
| --------------- | ------------ | ----- |
| `Dialog/SignIn` | `1554:79569` | 461   |

### F. Other matches

#### `Help Email` — 1 frame(s), 1280x793

Node ids: `1443:78522`

Immediate children of representative `1443:78522`:

| child name                                                                                                                                                                                                                             | child id     | width             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------- |
| `Screenshot 2025-11-17 at 11.22.51 AM 1`                                                                                                                                                                                               | `1443:78523` | 1280              |
| `Ellipse 94`                                                                                                                                                                                                                           | `1443:78524` | 44                |
| `Rectangle 34624322`                                                                                                                                                                                                                   | `1443:78525` | 420               |
| `Rectangle 34624323`                                                                                                                                                                                                                   | `1443:78526` | 420               |
| `Resonance`                                                                                                                                                                                                                            | `1443:78527` | 77                |
| `Rectangle 34624324`                                                                                                                                                                                                                   | `1443:78528` | 587               |
| `Your help request was sent to Jimmy’s Potion Brewing Companyner Discovery Update`                                                                                                                                                     | `1443:78529` | 610               |
| `Group 1000002056`                                                                                                                                                                                                                     | `1443:78530` | 52                |
| `Rectangle 34624327`                                                                                                                                                                                                                   | `1443:78534` | 798               |
| `Products selected:  Isithunywa  Serenity Drops Reason for request:  My order hasn’t arrived. Your message:  It’s been 1 week since my order. The creator will review your request and get back to you by email. Thank you, Resonance` | `1443:78535` | 436               |
| `Logo/Resonance`                                                                                                                                                                                                                       | `1443:78536` | 39.85732650756836 |
| `Rectangle 34624377`                                                                                                                                                                                                                   | `1443:78539` | 153               |

## 3. Node `1443:114245` — the "Weave/Sidebar" citation

**It exists.** It is:

- **type:** `instance` (a component instance, not an artboard/frame)
- **name:** `Weave/Sidebar`
- **size:** 40x982 (at x=81, y=0)
- **parent screen:** `1443:77507` `Orders/Orders` (1512x982)

Caveat for the code component that cites it: `1443:114245` is the **40px collapsed-rail** variant of `Weave/Sidebar`, sitting on the **Orders/Orders** screen — it is NOT the expanded interview/ProfileGen conversation panel. `Weave/Sidebar` appears **223 times** across the MVP page (essentially one per screen); the interview screens use their own expanded (~1432px) instances (e.g. `1443:78283` on `Onboarding/Creator/Interview` `1443:78282`, `1443:78558` on `ProfileGen/Interview` `1443:78556`). If the code intends the Weave conversation surface, an expanded-variant node id is the more representative reference than `1443:114245`.
