"""
Unit economics of Piko. All amounts in KZT.

Run:  python docs/economics/model.py
Change the ASSUMPTIONS below when real numbers appear (interviews, invoices,
token logs from the analysis table) and re-run. Results are explained in
docs/pricing.md.

Unit of the model: one intake ("набор"). A child is the second unit, because
the AI cost grows with the number of children.
"""

# ---------------------------------------------------------------- ASSUMPTIONS
# Every value here is an ASSUMPTION until it is replaced by a fact.
ACQUIRING = 0.025            # share of revenue taken by the payment provider
SUPPORT_PER_INTAKE = 16_000  # 2 hours of staff time x 8,000 per hour
INFRA_PER_YEAR = 96_000      # 8,000 per month per academy (server, DB, SMS, storage)
AI_PER_CHILD = 50            # KZT of model cost per child (budget, see docs/pricing.md)
KIDS = 150                   # average children per intake
INTAKES_PER_YEAR = 4         # intakes per academy per year (2 is the pessimistic case)
FIXED_PER_YEAR = {           # team and company costs per year
    "lean (600 тыс./мес.)": 7_200_000,
    "base (1,5 млн/мес.)": 18_000_000,
}
# Proposed price of one intake: BASE + PER_KID x children.
PRICE_BASE = 60_000
PRICE_PER_KID = 500
# --------------------------------------------------------------------------


def price(kids: int) -> int:
    return PRICE_BASE + PRICE_PER_KID * kids


def variable_cost(kids: int, ai: float = AI_PER_CHILD, intakes: int = INTAKES_PER_YEAR) -> float:
    """Costs that grow with usage, per intake, without acquiring."""
    return SUPPORT_PER_INTAKE + INFRA_PER_YEAR / intakes + ai * kids


def contribution(p: float, kids: int, ai: float = AI_PER_CHILD, intakes: int = INTAKES_PER_YEAR) -> float:
    """Money left from one intake to pay the fixed costs."""
    return p * (1 - ACQUIRING) - variable_cost(kids, ai, intakes)


def required_price(n_academies: int, fixed: float, profit: float, kids: int,
                   ai: float = AI_PER_CHILD, intakes: int = INTAKES_PER_YEAR) -> float:
    """Price per intake so that n academies cover the fixed costs plus a profit share."""
    per_intake = fixed * (1 + profit) / n_academies / intakes
    return (per_intake + variable_cost(kids, ai, intakes)) / (1 - ACQUIRING)


def main() -> None:
    print("1. Proposed price list: contribution per intake")
    print("   (base %s + %s per child, AI %s per child, %s intakes per year)"
          % (f"{PRICE_BASE:,}", PRICE_PER_KID, AI_PER_CHILD, INTAKES_PER_YEAR))
    for kids in (50, 100, 150, 300):
        p = price(kids)
        c = contribution(p, kids)
        print(f"   {kids:3d} children: price {p:8,d}  contribution {c:9,.0f}  margin {c / p * 100:5.1f}%"
              f"  per academy per year {c * INTAKES_PER_YEAR:10,.0f}")

    print("\n2. Break-even: academies needed with the proposed price list")
    for intakes in (4, 2):
        p = price(KIDS)
        annual = contribution(p, KIDS, intakes=intakes) * intakes
        for label, fixed in FIXED_PER_YEAR.items():
            print(f"   {KIDS} children, {intakes} intakes/year, team {label}: "
                  f"{fixed / annual:5.1f} academies (annual contribution per academy {annual:,.0f})")

    print(f"\n3. Price needed per intake (break-even and +30% profit), {KIDS} children, AI {AI_PER_CHILD}")
    for label, fixed in FIXED_PER_YEAR.items():
        for n in (10, 20, 30, 50):
            for intakes in (4, 2):
                p0 = required_price(n, fixed, 0.0, KIDS, intakes=intakes)
                p30 = required_price(n, fixed, 0.3, KIDS, intakes=intakes)
                print(f"   {label:22s} {n:2d} academies, {intakes} intakes/year: "
                      f"break-even {p0:9,.0f}   +30%: {p30:9,.0f}")

    print("\n4. AI cost sensitivity, intake of 300 children at the proposed price")
    p = price(300)
    for ai in (0, 25, 50, 100, 150, 300):
        c = contribution(p, 300, ai=ai)
        print(f"   AI {ai:3d} per child: contribution {c:9,.0f}  margin {c / p * 100:5.1f}%")

    print("\n5. Other tariffs")
    kids_network, intakes_network = 1200, 4
    p_net = 670_000
    c_net = (p_net * (1 - ACQUIRING) - SUPPORT_PER_INTAKE * intakes_network
             - INFRA_PER_YEAR - AI_PER_CHILD * kids_network)
    print(f"   Network, {p_net:,} per year, {kids_network} children, {intakes_network} intakes: "
          f"contribution {c_net:,.0f} ({c_net / p_net * 100:.1f}%)")
    p_fed, kids_fed = 600_000, 1_000
    c_fed = (p_fed * (1 - ACQUIRING) - 48_000 - INFRA_PER_YEAR / 4 - AI_PER_CHILD * kids_fed)
    print(f"   Federation, {p_fed:,} per regional intake, {kids_fed} children, 6 h support: "
          f"contribution {c_fed:,.0f} ({c_fed / p_fed * 100:.1f}%)")
    pilot = SUPPORT_PER_INTAKE + INFRA_PER_YEAR / INTAKES_PER_YEAR + AI_PER_CHILD * 50
    print(f"   Pilot (free, 50 children): cost to us {pilot:,.0f} per pilot")


if __name__ == "__main__":
    main()
