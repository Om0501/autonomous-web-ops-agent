// Per-workflow extraction schemas. Each source maps CSS selectors -> a normalized field name.
// This is the "predefined schema" the extraction prompt/parser must conform to (spec 7.5).

const SCHEMAS = {
  competitor: {
    label: "Competitor Offer Tracking",
    owner: "Growth",
    sources: {
      rivalstays: {
        base: "rivalstays.example",
        selectors: {
          offer_name: ".offer-name",
          discount: ".discount",
          validity: ".validity",
          cta_copy: ".cta",
        },
      },
    },
  },
  pricing: {
    label: "Hotel Pricing Watch",
    owner: "Revenue & Pricing",
    sources: {
      stayhub: {
        base: "stayhub.example",
        selectors: {
          room_type: ".room-type",
          nightly_rate: ".rate",
          availability: ".availability",
        },
      },
    },
  },
  campaign: {
    label: "Campaign Page Monitoring",
    owner: "Marketing Ops",
    sources: {
      ownlanding: {
        base: "ownlanding.example/campaigns",
        selectors: {
          headline: ".headline",
          placement: ".placement",
          cta_copy: ".cta",
        },
      },
    },
  },
};

module.exports = { SCHEMAS };
