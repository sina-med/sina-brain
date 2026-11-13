# Answer key — do NOT give this file to Gemini

Problems already known in each extraction, from the stored Claude audits and from reading the first-run output against the lecture. Used to score Gemini's review.

## Packet 1: larynx, instruction version p1 (71 concepts, 113 relations)

Flagged by the Claude auditor:

- **wrong-type** — `relation:external-laryngeal-nerve-injury|causes|cadaveric-position-of-the-vocal-cords`: Read as a sentence, this says external laryngeal nerve injury leads to the cadaveric position. The packet gives that position only for combined bilateral recurrent plus external nerve damage; external nerve injury on its own is given only weakness of phonation, so 'causes' overstates the link (related-to at most).
- **wrong-type** — `relation:recurrent-laryngeal-nerve-injury|causes|cadaveric-position-of-the-vocal-cords`: As a bare link this says recurrent laryngeal nerve injury leads to the cadaveric position, but the packet says recurrent nerve damage alone, even bilateral, leaves the cords paramedian. The cadaveric position needs the external laryngeal nerves damaged as well, so 'causes' is too strong for this pair (related-to at most).
- **unsupported** — `relation:vocalis-muscle|part-of|thyroarytenoid-muscle`: The packet never says the vocalis is a part of the thyroarytenoid. It lists the superior thyroarytenoid and the 'inferior thyroarytenoid or vocal muscle' as two separate constrictors, and treats vocalis (tensor) and thyroarytenoid (relaxer) as different muscles; the part-of link is inferred from the name and from outside knowledge.
- **unsupported** — `concept:thyroarytenoid-muscle`: The definition describes one thyroarytenoid muscle with 'a superior part' and 'an inferior part, the vocal muscle', and the alias equates it with the superior thyroarytenoid. The packet does not say either thing: it names superior and inferior thyroarytenoid as separate muscles and nowhere states that the 'thyroarytenoid' that relaxes the cords is the superior one.
- **unsupported** — `concept:laryngeal-prominence`: The definition itself is supported by card g7, but the second evidence quote ('this is the forward bulge where the two thyroid laminae meet') is not in the cited block q:1yzsihk-prominence, which words it differently; that wording comes from the distractor notes of q:7a90hl-hyoid and q:1fefrzi-thyroid-cart.
- **medically-doubtful** — `concept:acoustic-parameters-of-the-voice`: The packet supports 'pitch' as a third parameter set mainly by the shape of the supralaryngeal cavities, but standard teaching is that pitch is the perceived fundamental frequency of vocal fold vibration, and the parameter shaped by the resonating cavities is timbre (voice quality). The three parameters are normally frequency/pitch, intensity/loudness and timbre; the same applies to the relation acoustic-parameters-of-the-voice|related-to|supralaryngeal-cavity. The result lists only the internal inconsistency, not the departure from standard teaching.
- **medically-doubtful** — `relation:external-laryngeal-nerve|innervates|infraglottic-cavity`: The packet does say this, but standard teaching is that the external laryngeal nerve is motor (to the cricothyroid) and that sensation below the vocal folds is carried by the recurrent laryngeal nerve, as the packet itself states elsewhere. The same doubt covers the external-laryngeal-nerve definition and its passes-through link to the cricothyroid membrane. The result already reports this under conflicts.
- **medically-doubtful** — `concept:laryngeal-vein`: The packet supports drainage of the posterior laryngeal vein through the inferior thyroid vein to the subclavian vein. Standard teaching is that the inferior thyroid veins drain into the brachiocephalic veins, not the subclavian vein.
- **medically-doubtful** — `concept:larynx`: The packet supports an extent of C4 to C6, taking the upper border of the thyroid cartilage as the upper limit. Standard teaching gives the adult larynx as lying opposite C3 to C6, from the tip of the epiglottis / laryngeal inlet to the lower border of the cricoid.

Listed as missed by the Claude auditor: Thyrohyoid muscle; Galen's loop; Posterior commissure; Subglottic pressure; Pretracheal and paratracheal lymph nodes; Aortic arch; Laryngeal oedema in children; Stridor; Superior thyroid notch; Piriform sinus

## Packet 2: brainstem, instruction version p1 (72 concepts, 90 relations)

Flagged by the Claude auditor:

- **medically-doubtful** — `concept:cephalic-flexure`: The packet supports the definition, but standard embryology calls the bend between brainstem and spinal cord the cervical flexure; the cephalic flexure is the mesencephalic flexure itself. In standard teaching this concept and 'mesencephalic-flexure' are therefore one and the same thing, not two bends (the result records this under conflicts but still keeps two concepts).
- **medically-doubtful** — `concept:medial-eminence`: The packet says the medial eminence marks the midline, but in standard teaching the midline of the floor of the fourth ventricle is the median sulcus; the medial eminence is the paired longitudinal elevation on each side of it (the facial colliculus is its lower part). The alias 'median eminence', taken from a question option, is in standard usage a hypothalamic structure, not this landmark.
- **medically-doubtful** — `concept:accessory-nerve`: The definition calls the accessory nerve 'one of the mixed nerves', which the packet supports (the French grouping of IX, X and XI), but standard teaching is that CN XI is a purely motor nerve; only IX and X are mixed. The alias 'spinal nerve' is the slide's literal rendering of the French name for CN XI and in English means a nerve of the spinal cord, so it is misleading as a search alias.
- **medically-doubtful** — `concept:basilar-artery`: The definition says the basilar artery and its branches supply the brainstem, as the slide does, but standard teaching is the vertebrobasilar system: the medulla is supplied mainly by the vertebral arteries and their branches, which the packet itself hints at and the definition leaves out. The posterior choroidal artery is also normally taught as a branch of the posterior cerebral artery, not of the basilar artery directly.
- **wrong-type** — `relation:oculomotor-nerve|branch-of|midbrain`: Read as a sentence, 'Oculomotor nerve is a branch of Midbrain' is not what the packet says: it says the nerve emerges from (exits) the surface of the midbrain, and branch-of is meant for a nerve or vessel arising from a parent nerve or vessel. The same applies to the other seven branch-of relations (trochlear-nerve to midbrain; trigeminal-nerve and abducens-nerve to pons; hypoglossal-, glossopharyngeal-, vagus- and accessory-nerve to medulla-oblongata); related-to, or located-in as used for the facial and vestibulocochlear nerves, would not misstate the link.

Listed as missed by the Claude auditor: Abducens nucleus; Medullary velum (superior and inferior); Pontocerebellar fibres; Sulci of the medulla where nerves emerge (anterior collateral groove between pyramid and olive; posterior collateral groove behind the olive); Spinal cord; Cranial nerve palsy (ipsilateral); Choroid plexus of the fourth ventricle; Medial geniculate body; Posterior cerebral artery and superior cerebellar artery; Unilateral deafness and tinnitus

## Packet 3: larynx, instruction version p3 (77 concepts, 105 relations)

Flagged by the Claude auditor:

- **unsupported** — `concept:thyroarytenoid-muscle`: The packet never describes one thyroarytenoid muscle 'with superior and inferior parts' running from the reentrant angle to the arytenoid; it lists a superior thyroarytenoid and an inferior thyroarytenoid (vocal muscle) as separate constrictors, and separately says 'thyroarytenoid' relaxes the cords. The definition merges them from outside knowledge, so its inferior part is the same muscle the result's vocalis concept says tenses the cord; the two quotes given state only the relaxing action.
- **medically-doubtful** — `concept:cricothyroid-ligament`, `relation:vocal-ligament|part-of|cricothyroid-ligament`: The packet supports this, but standard teaching separates the median cricothyroid ligament (the anterior midline band between cricoid arch and thyroid cartilage, the site of cricothyroidotomy) from the lateral part, the conus elasticus or cricovocal membrane, whose free upper edge is the vocal ligament. The result gives 'median cricothyroid ligament' and 'cricothyroid membrane' as aliases of the structure that forms the vocal ligament, and this is not reported under conflicts.

Listed as missed by the Claude auditor: Superior thyroid artery; Vagus nerve; Thyrohyoid muscle; Thyroidectomy; Inferior thyroid artery; Interarytenoid region

## Packet 4: brainstem, instruction version p3 (84 concepts, 109 relations)

Flagged by the Claude auditor:

- **medically-doubtful** — `concept:accessory-nerve`: The definition calls the accessory nerve a mixed nerve, following the packet's grouping of IX, X and XI as 'the mixed nerves'. Standard teaching: IX and X are mixed, but the accessory nerve (XI) is a purely motor nerve. The result's conflict on the accessory nerve covers only its naming and spinal root, not this claim.
- **wrong-type** — `relation:trochlear-nerve|emerges-from|inferior-colliculus`: Read as a sentence this says the trochlear nerve emerges from the inferior colliculus. The packet only says it emerges from the dorsal midbrain below the colliculi; the colliculus is a neighbouring landmark, so the link is related-to (as the result did for hypoglossal nerve and pyramid/olive), not emerges-from.
- **medically-doubtful** — `concept:midbrain`, `relation:tectum|part-of|midbrain`: Both state that the midbrain has two parts, tectum and cerebral peduncles. Standard teaching: the midbrain has a tectum, a tegmentum and the crura cerebri (the cerebral peduncle comprising tegmentum plus crus, with the substantia nigra between). The result reports this conflict but lists only the cerebral peduncle concept and its part-of relation in affects; these two items rest on the same statement and are missing there.

Listed as missed by the Claude auditor: Neural tube flexures (cephalic flexure and mesencephalic flexure); Posterior choroidal artery; Interpeduncular branches of the basilar artery; Cranial nerve nuclei of the brainstem (grey matter); Transverse pontocerebellar fibres; Brainstem (medullary) compression

## Known in packets 1 and 2 but not formally listed by the Claude auditor

Found by reading the first-run output, or mentioned by the auditor without listing each item.

Packet 1 (larynx):
- `relation:thyroarytenoid-muscle|acts-on|vocal-fold-tension` — the lecture says the muscle *relaxes* the cords; "acts-on tension" loses the direction.
- `relation:anterior-commissure|part-of|glottis` — the only quotation is a heading; it does not state the link.
- `concept:external-laryngeal-nerve` — its definition repeats the disputed sensory supply below the cords (the auditor flagged only the relation).
- Four ordinary definitions carry a clinical consequence: posterior cricoarytenoid muscle, glottis (and in packet 2: facial colliculus, respiratory and cardiovascular centres).

Packet 2 (brainstem):
- Seven more nerve-emergence relations typed `branch-of` like the one flagged: trochlear→midbrain, trigeminal→pons, abducens→pons, hypoglossal→medulla, glossopharyngeal→medulla, vagus→medulla, accessory→medulla.
- `concept:medial-eminence` alias "median eminence" is the standard name of a different (hypothalamic) structure.

## Lecture-level conflicts both Claude workers reported (a good reviewer should notice these)

- Brainstem slide 20: trochlear nerve's muscle "ensures upward gaze" (standard: downward and inward).
- Brainstem slide 4: cephalic flexure placed between brainstem and spinal cord, listed apart from the mesencephalic flexure.
- Brainstem: CN XI grouped with the "mixed nerves"; basilar artery alone given as the supply; midbrain described as two parts.
- Larynx: external laryngeal nerve given sensory supply below the cords; larynx extent C4–C6; inferior thyroid vein to subclavian vein; pitch as a parameter separate from frequency; "cylindric stratified" respiratory epithelium; thyroarytenoid described as one muscle with two parts (the extraction's error in all versions).
