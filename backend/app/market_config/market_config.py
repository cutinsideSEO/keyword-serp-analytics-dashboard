"""
Market Configuration System

This module provides configurable domain types and market settings
to make the dashboard generic across different industries/datasets.

To switch markets, update the CURRENT_MARKET variable or set
MARKET_CONFIG environment variable.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
import os


@dataclass
class DomainType:
    """Configuration for a domain type."""
    id: str
    display_name: str
    ai_description: str
    is_brand_type: bool = False  # True for the type that represents tracked brands
    examples: List[str] = field(default_factory=list)

    # Styling (used by frontend via API)
    tremor_color: str = "gray"
    hex_color: str = "#6B7280"
    gradient: str = "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)"
    bg_class: str = "bg-gray-50"
    text_class: str = "text-gray-700"
    border_class: str = "border-gray-200"
    icon: str = "Building2"


@dataclass
class MarketConfig:
    """Configuration for a market/industry."""
    market_id: str
    market_name: str
    industry_context: str  # Used in AI prompts
    domain_types: List[DomainType]
    brand_category_names: List[str] = field(default_factory=list)  # Category names to treat as "brands"
    language: str = "en"
    text_direction: str = "ltr"  # ltr or rtl

    def get_domain_type(self, type_id: str) -> DomainType | None:
        """Get a domain type by ID."""
        for dt in self.domain_types:
            if dt.id == type_id or dt.display_name == type_id:
                return dt
        return None

    def get_brand_type(self) -> DomainType | None:
        """Get the domain type that represents brands."""
        for dt in self.domain_types:
            if dt.is_brand_type:
                return dt
        return None

    def get_domain_type_names(self) -> List[str]:
        """Get list of all domain type display names."""
        return [dt.display_name for dt in self.domain_types]

    def get_non_brand_type_names(self) -> List[str]:
        """Get list of domain type names that are not brand types."""
        return [dt.display_name for dt in self.domain_types if not dt.is_brand_type]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "market_id": self.market_id,
            "market_name": self.market_name,
            "industry_context": self.industry_context,
            "language": self.language,
            "text_direction": self.text_direction,
            "domain_types": [
                {
                    "id": dt.id,
                    "display_name": dt.display_name,
                    "is_brand_type": dt.is_brand_type,
                    "tremor_color": dt.tremor_color,
                    "hex_color": dt.hex_color,
                    "gradient": dt.gradient,
                    "bg_class": dt.bg_class,
                    "text_class": dt.text_class,
                    "border_class": dt.border_class,
                    "icon": dt.icon,
                }
                for dt in self.domain_types
            ]
        }


# =============================================================================
# MARKET CONFIGURATIONS
# =============================================================================

# Israeli Insurance Market Configuration
INSURANCE_IL_CONFIG = MarketConfig(
    market_id="insurance_il",
    market_name="Israeli Insurance Market",
    industry_context="insurance industry in Israel",
    language="he",
    text_direction="rtl",  # Hebrew keywords are RTL
    brand_category_names=["insurance_company___canonical", "comparison_platform___canonical"],
    domain_types=[
        DomainType(
            id="insurance_company",
            display_name="Insurance Company",
            ai_description="Official insurance company website selling their own insurance products (e.g., harel-group.co.il, migdal.co.il, fnx.co.il, clalbit.co.il)",
            is_brand_type=True,
            examples=["harel-group.co.il", "migdal.co.il", "fnx.co.il", "clalbit.co.il", "menoramivt.co.il"],
            tremor_color="blue",
            hex_color="#3B82F6",
            gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
            bg_class="bg-blue-50",
            text_class="text-blue-700",
            border_class="border-blue-200",
            icon="Building2",
        ),
        DomainType(
            id="comparison_site",
            display_name="Comparison Site",
            ai_description="Insurance price comparison platforms that let users compare quotes from multiple insurers (e.g., wobi.co.il, bestie.co.il, shukabit.co.il)",
            is_brand_type=False,
            examples=["wobi.co.il", "bestie.co.il", "shukabit.co.il", "hova.co.il", "trusty.co.il"],
            tremor_color="purple",
            hex_color="#8B5CF6",
            gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
            bg_class="bg-purple-50",
            text_class="text-purple-700",
            border_class="border-purple-200",
            icon="Scale",
        ),
        DomainType(
            id="ugc",
            display_name="UGC",
            ai_description="User-generated content sites including forums, social media, Q&A sites (e.g., facebook.com, reddit.com, fxp.co.il, ynet forums)",
            is_brand_type=False,
            examples=["facebook.com", "reddit.com", "fxp.co.il"],
            tremor_color="amber",
            hex_color="#F59E0B",
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            bg_class="bg-amber-50",
            text_class="text-amber-700",
            border_class="border-amber-200",
            icon="MessageCircle",
        ),
        DomainType(
            id="third_party",
            display_name="3rd Party",
            ai_description="Review sites, news, content sites, affiliate sites, government sites (e.g., cma.gov.il, calcalist.co.il, ynet.co.il)",
            is_brand_type=False,
            examples=["calcalist.co.il", "ynet.co.il", "themarker.com"],
            tremor_color="teal",
            hex_color="#14B8A6",
            gradient="linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
            bg_class="bg-teal-50",
            text_class="text-teal-700",
            border_class="border-teal-200",
            icon="Newspaper",
        ),
    ],
)

# Bicycle Market Configuration (original)
BICYCLE_CONFIG = MarketConfig(
    market_id="bicycle",
    market_name="Bicycle & Cycling Market",
    industry_context="bicycle/cycling industry",
    language="en",
    text_direction="ltr",
    brand_category_names=["brand"],  # Original bicycle dataset uses "brand" category
    domain_types=[
        DomainType(
            id="brand",
            display_name="Brand",
            ai_description="Official brand website selling their own products (e.g., trekbikes.com for Trek)",
            is_brand_type=True,
            examples=["trekbikes.com", "specialized.com", "giant-bicycles.com"],
            tremor_color="blue",
            hex_color="#3B82F6",
            gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
            bg_class="bg-blue-50",
            text_class="text-blue-700",
            border_class="border-blue-200",
            icon="Building2",
        ),
        DomainType(
            id="reseller",
            display_name="Reseller",
            ai_description="Multi-brand retailers/aggregators (e.g., Amazon, Walmart, performancebike.com)",
            is_brand_type=False,
            examples=["amazon.com", "walmart.com", "rei.com"],
            tremor_color="orange",
            hex_color="#F59E0B",
            gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            bg_class="bg-orange-50",
            text_class="text-orange-700",
            border_class="border-orange-200",
            icon="ShoppingCart",
        ),
        DomainType(
            id="ugc",
            display_name="UGC",
            ai_description="User-generated content sites (Reddit, Facebook, bikeforums.net, forums.mtbr.com)",
            is_brand_type=False,
            examples=["reddit.com", "facebook.com", "bikeforums.net"],
            tremor_color="purple",
            hex_color="#8B5CF6",
            gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
            bg_class="bg-purple-50",
            text_class="text-purple-700",
            border_class="border-purple-200",
            icon="MessageCircle",
        ),
        DomainType(
            id="third_party",
            display_name="3rd Party",
            ai_description="Reviews, content, news, or affiliate sites (bikeradar.com, cyclingnews.com)",
            is_brand_type=False,
            examples=["bikeradar.com", "cyclingnews.com"],
            tremor_color="emerald",
            hex_color="#10B981",
            gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)",
            bg_class="bg-emerald-50",
            text_class="text-emerald-700",
            border_class="border-emerald-200",
            icon="Newspaper",
        ),
    ],
)

# =============================================================================
# MARKET SELECTION
# =============================================================================

# Available markets
MARKETS: Dict[str, MarketConfig] = {
    "insurance_il": INSURANCE_IL_CONFIG,
    "bicycle": BICYCLE_CONFIG,
}

# Current market - can be set via environment variable
CURRENT_MARKET = os.environ.get("MARKET_CONFIG", "insurance_il")


def get_market_config() -> MarketConfig:
    """Get the current market configuration."""
    return MARKETS.get(CURRENT_MARKET, INSURANCE_IL_CONFIG)


# Convenience export for domain types
DOMAIN_TYPES = get_market_config().domain_types
