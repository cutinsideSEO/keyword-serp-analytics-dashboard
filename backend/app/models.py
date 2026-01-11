"""
SQLAlchemy ORM models for the analytics database.

Defines all database tables and their relationships.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Keyword(Base):
    """
    Stores unique keywords with their search volume and modifier group.

    Each keyword has associated tags (via keyword_tags) and SERP results.
    """

    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    volume: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    modifier_group: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    tags: Mapped[List["KeywordTag"]] = relationship(
        "KeywordTag", back_populates="keyword", cascade="all, delete-orphan"
    )
    serp_results: Mapped[List["SerpResult"]] = relationship(
        "SerpResult", back_populates="keyword", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Keyword(id={self.id}, keyword='{self.keyword}', volume={self.volume})>"


class Category(Base):
    """
    Defines tag categories (e.g., 'brand', 'bicycle_type', 'color').

    Categories are the column names from the CSV that hold tag values.
    """

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)

    # Relationships
    tags: Mapped[List["KeywordTag"]] = relationship(
        "KeywordTag", back_populates="category", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name='{self.name}')>"


class KeywordTag(Base):
    """
    Links keywords to their tag values within categories.

    This is a many-to-many relationship with an additional value column.
    Example: keyword='trek bikes' -> category='brand' -> value='Trek'
    """

    __tablename__ = "keyword_tags"
    __table_args__ = (
        UniqueConstraint("keyword_id", "category_id", name="uq_keyword_category"),
        Index("ix_keyword_tags_category_value", "category_id", "value"),
        Index("ix_keyword_tags_value", "value"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    keyword_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    value: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    keyword: Mapped["Keyword"] = relationship("Keyword", back_populates="tags")
    category: Mapped["Category"] = relationship("Category", back_populates="tags")

    def __repr__(self) -> str:
        return f"<KeywordTag(keyword_id={self.keyword_id}, category_id={self.category_id}, value='{self.value}')>"


class Domain(Base):
    """
    Stores unique domains found in SERP results.

    Domains can be linked to brands via the brand_domains table.
    """

    __tablename__ = "domains"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    serp_results: Mapped[List["SerpResult"]] = relationship(
        "SerpResult", back_populates="domain", cascade="all, delete-orphan"
    )
    brand_mappings: Mapped[List["BrandDomain"]] = relationship(
        "BrandDomain", back_populates="domain", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Domain(id={self.id}, domain='{self.domain}')>"


class SerpResult(Base):
    """
    Stores individual SERP ranking entries for each keyword.

    Each record represents one search result (usually organic) for a keyword.
    """

    __tablename__ = "serp_results"
    __table_args__ = (
        Index("ix_serp_results_keyword_rank", "keyword_id", "rank_group"),
        Index("ix_serp_results_domain_rank", "domain_id", "rank_group"),
        Index("ix_serp_results_rank_group", "rank_group"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    keyword_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("keywords.id", ondelete="CASCADE"), nullable=False
    )
    domain_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    rank_group: Mapped[int] = mapped_column(Integer, nullable=False)
    rank_absolute: Mapped[int] = mapped_column(Integer, nullable=False)
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    result_type: Mapped[str] = mapped_column(String(50), nullable=False, default="organic")
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    keyword: Mapped["Keyword"] = relationship("Keyword", back_populates="serp_results")
    domain: Mapped["Domain"] = relationship("Domain", back_populates="serp_results")

    def __repr__(self) -> str:
        return f"<SerpResult(keyword_id={self.keyword_id}, domain_id={self.domain_id}, rank={self.rank_group})>"


class BrandDomain(Base):
    """
    Maps brand names to their owned domains.

    This table is populated by AI analysis and can be manually adjusted.
    A brand can own multiple domains, but one should be marked as primary.

    Domain types:
    - Brand: Official brand website selling their own products
    - Reseller: Aggregators/retailers selling multiple brands
    - UGC: User-generated content sites (Reddit, forums, etc.)
    - 3rd Party: Third-party content, reviews, or affiliate sites
    """

    __tablename__ = "brand_domains"
    __table_args__ = (
        Index("ix_brand_domains_brand_name", "brand_name"),
        UniqueConstraint("brand_name", "domain_id", name="uq_brand_domain"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    brand_name: Mapped[str] = mapped_column(String(200), nullable=False)
    domain_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    domain_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Brand"
    )  # Brand, Reseller, UGC, 3rd Party
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )

    # Relationships
    domain: Mapped["Domain"] = relationship("Domain", back_populates="brand_mappings")

    def __repr__(self) -> str:
        return f"<BrandDomain(brand='{self.brand_name}', domain_id={self.domain_id}, type={self.domain_type}, primary={self.is_primary})>"
