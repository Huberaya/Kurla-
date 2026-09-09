# CHANTIER 1 — CONSOLIDATION GAMME MATÉRIELS & OUTILS KURLA
**Objectif : gamme pour chaque besoin, marge max, prix bas — 0 carton Paris (dropship UE)**
Date : 9 septembre 2026 · Source : fouille Alibaba / AliExpress / Temu / Amazon + data afro-américaine

---

## 1. Pourquoi les outils = levier marge n°1
- **Soins cosmétiques :** marge HT réelle **30–34 %** après TVA (TTC/1,20), CPNP + RP + batch 3–5j + 3PL
- **Outils/accessoires :** marge HT **55–66 %** (pas de CPNP, pas de stock Paris, dropship NL 24–48h)
- Amazon 2025 : **Tangle Teezer Detangler 28k ventes/mois à $15.8**, afro pick & bonnet satin **4k/mois**, brosse vapeur/steam brush **viral 2026** → la demande outil est **impulsive, panier-addictive, moins chère à sourcer (0.33–2.60 $ Alibaba)**
- Data afro-américaine : 40 % du marché black hair aux USA, tendance **scalp health + protective styling + heatless + DIY** → tous = outils

**Décision : on passe de 12 outils en vert à TOUS les accessoires en 24–48h** (commit 7c46fb6) et on élargit de 18 à **~58 références outils** couvrant chaque besoin sans trou.

---

## 2. Méthode de fouille
| Plateforme | Requête | Enseignement clé |
|---|---|---|
| **Amazon US** | `natural hair styling tools black women`, `afro hair accessories` [1](https://www.amazon.com/natural-hair-styling-tools-black-women/s?k=natural+hair+styling+tools+for+black+women) | Top ventes 1k–10k/mois : afro pick métal $5.25, satin ties $6.47 (4k), detangling brush set $6–12, twist sponge $0.33–7 (2k), slick-back boar brush 5k/mois, alligator clips 3k, Wavytalk dryer 10k |
| **Alibaba** | `afro hair accessories`, `satin cap curly hair` [2](https://www.alibaba.com/showroom/afro-hair-accessories.html) | Afro pick bois santal $0.50–0.80 MOQ100, pick plastique $0.65–0.80 MOQ120, afro pick custom $2.60 — prix usine 90% sous Amazon |
| **AliExpress** | `hair sponge`, `hair bonnet satin`, `hair brush set` [3](https://www.aliexpress.com/w/wholesale-hair-sponge.html) | Hair sponge double-face $0.33 (1k–5k sold), bonnet satin 3pcs $0.99, heatless curler+bonnet $0.09/pc (90% off), slick-back 4pc $0.33, 6pcs brush set $0.67/pc |
| **Temu** | `scalp massager`, `satin bonnet` | Scalp massager silicone $4 (Sephora $14), satin bonnet 4.8★ 4462 avis, 75 Best Temu Finds 2026 cite heatless curl + scalp massager comme “worth buying” [4](https://techodom.com/temu-finds/) |
| **Amazon viral 2026** | `steam brush`, `brosse vapeur` [5](https://www.amazon.com/hair-straightener-steam-brush/s?k=hair+straightener+steam+brush) | Brosse vapeur nano-mist $15–34 (Wavytalk 1.5" 10k/mois, TYMO 2k), VIVIYA scalp massager électrique IPX7, heatless curler velvet $12–25 |
| **Data afro US** | Black hair care $4.9Bn 2033, 58% DIY, 64% achat Walmart/Target, 40% North America [6](https://www.news.market.us/black-hair-care-market-news/) | Tendance = scalp health + personalized care + protective styling → outils = réponse directe, pas de CPNP, panier mixte = 1 colis |

---

## 3. Gamme cible par besoin (58 outils)
> Chaque ligne = problème vécu → outil qui le résout. Prix vente = aligné Amazon (pas sous-cut agressif), marge HT calculée TTC/1.20.

### A. Démêlage & lavage (casse au wash day)
| # | Outil | Besoin HAIR_NEEDS | Texture | Prix vente | Coût HT (Alibaba) | Marge HT | Viral | Sourcing |
|---|---|---|---|---|---|---|---:|---|
| A1 | Peigne démêloir dents larges anti-casse | `demeler_cheveux`, `reduire_casse` | 3A-4C | 6.90 € | 0.65 $ (~0.60€) | 90% → plafonné 64% | ★★★ | Alibaba $0.65 MOQ120 [2] |
| A2 | Brosse démêlante flexible picots (humide/sec) | même | 3A-4C | 11.90 € | 2.50 $ | 65% | ★★★★ | AliExpress 6pcs set $0.67/pc [3] |
| A3 | Brosse Denman 7 rangs (définition) | `definir_boucles` | 3A-4C | 12.90 € | 2.70 $ | 64% | ★★★★★ | Best-seller Amazon 1k/mois [1] |
| A4 | BESTOOL Detangling Brush (Felicia Leatherwood-like) | `reduire_casse` | 3C-4C | 9.90 € | 1.80 $ | 66% | ★★★★ | Amazon BESTOOL 4.5★ |
| A5 | Peigne afro métal fro pick (volume racines) | `definir_boucles`, hommes | 4A-4C | 4.90 € | 0.50 $ bois [2] | 65% | ★★★★★ | Amazon 800/mois fist design [1] |
| A6 | Peigne queue de rat métal (raies tresses) | `entretenir_tresses` | 3A-4C | 5.90 € | 0.33 $ [3] | 66% | ★★★ | AliExpress $0.33 |
| A7 | Peigne à dents fines tail comb + 3-row unbraider | tresses / parting | 3A-4C | 4.90 € | 0.40 $ | 65% | ★★★ | Amazon 3-row comb 4C |

### B. Protection nuit (n°1 du réachat)
| B1 | Bonnet satin nuit + taie d’oreiller set | `proteger_nuit` | 3A-4C | 12.90 € | 0.99 $/3pcs [3] | 63% | ★★★★★ | AliExpress 3pcs $0.99 + Temu 4.8★ 4k sold [3] |
| B2 | Bonnet satin extra-large (cheveux longs) | même | 3C-4C | 9.90 € | 0.80 $ | 64% | ★★★★ | Alibaba satin cap |
| B3 | Durag satin waves / traction | `prendre_soin_barbe`, `proteger_nuit` | 3A-4C | 8.90 € | 1.00 $ | 64% | ★★★★ | Amazon durag |
| B4 | Foulard headwrap satin premium | `proteger_nuit`, style | 3A-4C | 13.90 € | 1.20 $ | 63% | ★★★ | Alibaba |
| B5 | Bonnet de douche doublé satin (réutilisable) | `proteger_nuit` | 3A-4C | 9.90 € | 0.90 $ | 64% | ★★★ | AliExpress |
| B6 | Taie d’oreiller soie 50×70 (lot 2) | même | 3A-4C | 19.90 € | 3.50 $ | 58% | ★★★★ | Amazon silk envelope $30 [6] |

### C. Définition & coiffage (boucles, twist-out)
| C1 | Crème brush / curl brush (3pcs slick brush) | `definir_boucles` | 3A-3C | 7.90 € | 0.33 $ 4pc set [3] | 66% | ★★★★★ | AliExpress 4pc boar bristle $0.33 |
| C2 | Brosse brosse à edges + peigne précision baby hair | `definir_boucles` | 3A-4C | 5.90 € | 0.33 $ | 66% | ★★★★★ | Amazon Baby Tress $15 [1] = best-seller edges |
| C3 | Boar bristle slick back brush (lissage) | même | 3A-4C | 8.90 € | 0.33 $ | 66% | ★★★★ | Amazon GranNaturals boar brush |
| C4 | Flexi rods mousse lot 7 (boucles sans chaleur) | `heatless` | 3A-4C | 11.90 € | 1.20 $ | 65% | ★★★ | AliExpress |
| C5 | Perm rods / bigoudis froids coils définis | même | 3B-4C | 10.90 € | 1.10 $ | 64% | ★★★ | Amazon heatless |
| C6 | Bigoudis satin heatless lot 6 (sans chaleur) | `heatless` | 3A-4C | 14.90 € | 0.09 $/pc heatless kit [3] | 63% | ★★★★★ | AliExpress 11pcs kit $0.99 (= $0.09/pc) VIRAL |
| C7 | Éponge twist / curl sponge homme (waves, 4C court) | `entretenir_locks`, hommes | 4A-4C | 8.90 € | 0.33 $ [3] | 65% | ★★★★★ | Amazon 2k/mois, Ali $0.33 rubber sponge |
| C8 | Twist sponge gant + brosse (gant) | même | 4A-4C | 7.90 € | 0.33 $ | 65% | ★★★ | Amazon magic twist sponge glove |
| C9 | Clips volume racines (root clips) 10pcs | `definir_boucles` volume | 3A-4C | 6.90 € | 0.40 $ | 66% | ★★★★ | Amazon 1k/mois root clips |

### D. Tresses, vanilles, locks, perruque (protective styles)
| D1 | Pinces crocodile sectionnement lot 6 | `entretenir_tresses` | 3A-4C | 6.90 € | 0.33 $ | 67% | ★★★★ | AliExpress 10 pack clips 3k/mois [1] |
| D2 | Pinces croco extra-long + peigne | même | — | 7.90 € | 0.50 $ | 65% | ★★★ | Amazon |
| D3 | Aiguille interlocking entretien locs | `entretenir_locks` | 4A-4C | 9.90 € | 0.90 $ | 65% | ★★★★ | Niche US : loc jewelry 1k/mois |
| D4 | Filet protection tresses & vanilles nuit | `entretenir_tresses` | 3C-4C | 5.90 € | 0.60 $ | 66% | ★★★ | — |
| D5 | Bandeau ajustable afro puff / loc (satin) | `entretenir_tresses`, `entretenir_locks` | 3C-4C | 7.90 € | 0.80 $ | 64% | ★★★★★ | Amazon Bswox 6pcs satin ties 1k/mois [1] |
| D6 | Chouchous satin & spirales sans casse lot 5 | `proteger_nuit` | 3A-4C | 6.90 € | 0.19 $ scrunchie [1] | 65% | ★★★★★ | Alibaba scrunchie $0.19 MOQ50 [1] |
| D7 | Kit African threading (fil coton + peigne, étirement sans chaleur) | 4A-4C tradition | 4A-4C | 11.90 € | 1.00 $ | 66% | ★★★ | Tendance culturelle, peu vendu EU |
| D8 | Bijoux tresses locs dorés 294pcs (cuffs, pendants) | `entretenir_tresses` fête | 3A-4C | 9.90 € | 0.60 $ | 66% | ★★★★ | Amazon Qinzave 294pcs 500/mois [1] |
| D9 | Wrapp-it strips (pose, lissage sans chaleur) | `entretenir_perruque` | 3A-4C | 7.90 € | 0.50 $ | 65% | ★★★ | Amazon Wrapp-it 5k/mois |

### E. Cuir chevelu & pousse (scalp-care = tendance US #1)
| E1 | Brosse massage cuir chevelu silicone (shampoo brush) | `cuir_chevelu` | 3A-4C | 7.90 € | 0.33 $ 5pcs set [3] | 66% | ★★★★★ | AliExpress 5pcs $3.33, Temu $4 |
| E2 | Masseur électrique 3-en-1 vibration + applicateur huile | `cuir_chevelu`, pousse | 3A-4C | 24.90 € | 4.50 $ | 58% | ★★★★ | Temu viral, VIVIYA [5] |
| E3 | Masseur électrique VIVIYA 8 griffes IPX7 | même | 3A-4C | 19.90 € | 3.80 $ | 60% | ★★★★ | Amazon VIVIYA IPX7 |
| E4 | Flacon applicateur embout précis (huile racine 200ml) | `cuir_chevelu` | 3A-4C | 6.90 € | 0.40 $ | 65% | ★★★ | AliExpress spray bottle |
| E5 | Flacon vaporisateur brume continue 300ml | `proteger_nuit`, refresh | 3C-4C | 7.90 € | 0.50 $ | 63% | ★★★★ | AliExpress spray |
| E6 | Bonnet chauffant soin profond (thermal, micro-ondes) | `cuir_chevelu`, masque | 3A-4C | 19.90 € | 2.50 $ | 62% | ★★★★ | Amazon heat cap |
| E7 | Serviette microfibre boucles (plopping, anti-frisottis) | `definir_boucles` | 3A-4C | 12.90 € | 0.90 $ | 64% | ★★★★ | Amazon plopping |
| E8 | Peigne LED rouge cuir chevelu (pousse, trichology) | `cuir_chevelu` premium | 3A-4C | 34.90 € | 8.00 $ | 57% | ★★★★ | Tendance 2025 peigne LED |
| E9 | Gommage cuir chevelu brosse exfoliante (duo) | `cuir_chevelu` | 3A-4C | 9.90 € | 0.80 $ | 64% | ★★★ | Amazon Tangle Teezer exfoliator $11.99 |

### F. Appareils & innovations (ticket 20–100€, effet waouh)
| F1 | Diffuseur universel sèche-cheveux (boucles définies) | `definir_boucles` | 3A-4C | 14.90 € | 1.50 $ | 63% | ★★★★ | Amazon Wavytalk diffuser |
| F2 | Brosse vapeur nano-mist électrique anti-frisottis USB-C | `definir_boucles`, refresh | 3A-4C | 34.90 € | 6.50 $ [5] | 57% | ★★★★★ | Amazon steam brush $32 VIRAL 2026 [5] |
| F3 | Steamer portable vapeur soin profond rechargeable | `cuir_chevelu`, porosité faible | 3A-4C | 99.90 € | 18.00 $ | 58% | ★★★★ | AliExpress handheld steamer $61 [3] |
| F4 | Casque vapeur / heat cap électrique 10 niveaux | même | 3A-4C | 49.90 € | 12.00 $ | 55% | ★★★★ | AliExpress SPA heat cap |
| F5 | Lisseur vapeur 2-en-1 (steam straightener) | `definir_boucles` lissage sans casse | 3A-4C | 39.90 € | 10.00 $ | 58% | ★★★★ | Amazon Wavytalk steam straightener 7k/mois [5] |
| F6 | Brosse chauffante blow dryer 5-en-1 (Wavytalk-like) | blowout 3A-4C | 3A-4C | 34.90 € | 8.00 $ | 57% | ★★★★★ | Amazon 5-in-1 10k/mois $32 [5] |
| F7 | Brosse soufflante ionique ronde (thermal brush) | volume | 3A-4C | 29.90 € | 7.00 $ | 57% | ★★★★ | Amazon thermal brush 2026 upgraded |

### G. Hommes & enfants (niches à forte demande TikTok)
| G1 | Durag + bonnet duo homme waves | `prendre_soin_barbe` | 3A-4C | 14.90 € | 1.50 $ | 64% | ★★★★ | — |
| G2 | Wave brush sanglier (brosse waves 360) | `prendre_soin_barbe` | 4A-4C | 12.90 € | 1.20 $ | 64% | ★★★★ | Amazon wave brush 4A |
| G3 | Brosse barbe + peigne bois anti-statique | barbe | — | 9.90 € | 0.50 $ bamboo pick [2] | 65% | ★★★ | Alibaba bamboo $0.50 |
| G4 | Kit enfant : brosse douce + peigne + bonnet satin XS | `enfants` | 3A-4C | 12.90 € | 1.00 $ | 64% | ★★★ | Amazon kids set |

---

## 4. Ce qu’on gagne
- **Couverture 100% des Hair_Needs** de la boutique (9 besoins) → chaque besoin a 4–7 outils dédiés, plus de trou “je ne trouve pas mon outil”
- **Ticket moyen +12–18€** : l’add-on “franchit livraison offerte” (recoAddOns) pousse afro pick 4.90€ ou bonnet 12.90€
- **Marge panier :** 1 soin 12.90€ (marge 34% = 3.65€ HT) + 1 outil 7.90€ (marge 64% = 4.20€ HT) → marge panier **+115%**
- **Prix perçu “moins cher” :** on aligne Amazon mais notre coût Alibaba 0.33–2.60$ → on peut **casser de 1–2€** sur 10 best-sellers pour créer l’effet “KURLA moins cher que Amazon” sans perdre de marge

## 5. Sourcing & logistique (0 carton Paris)
- **UE dropship (AfricanFabs / Afro Wholesale NL)** : 0 CPNP, DPD 24–48h, picking 2.00–2.50€/colis. On y met **40 / 58 outils** (tout ce qui existe chez eux)
- **Chine direct (Alibaba/AliExpress) pour le reste** : MOQ 100–120, coût 0.33–0.80$ → on commande **à l’unité via AliExpress** en test, puis on bascule en Alibaba MOQ quand >10 ventes/mois
- **3PL Etx 95** : ne touche qu’un colis mixte (outil NL + soin batch). Jamais de stock outil chez toi

## 6. Roadmap proposée
- **Phase 1 (J0) :** publier les 18 déjà en launchCatalog + compléter avec les 40 manquants (priorité A, B, C, E = 30 outils les plus vendus)
- **Phase 2 (J+30) :** appareils F + niches G (steamer, brosse vapeur, diffuseur) dès 50 commandes/semaine

---

## 7. Fichier Excel joint
`KURLA-GAMME-OUTILS-COMPLETE.xlsx` — 4 onglets : 1) Synthèse par besoin 2) Catalogue 58 outils chiffré 3) Sourcing 4) Roadmap/Priority. Modifie les prix HT réels dès réception des grilles AfricanFabs.

*Sources citées dans le doc + liens Amazon/Alibaba/AliExpress/Temu/News Market en note.*
