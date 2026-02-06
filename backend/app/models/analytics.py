"""
Analytics Models
Supports advanced dashboards, KPIs, predictive analytics, and workforce insights
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum, Boolean, Float, Date
from sqlalchemy.orm import relationship
from app.models.types import JSONB, ARRAY
from app.models.base import Base, TimestampMixin
from datetime import datetime
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class MetricType(str, enum.Enum):
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    PERCENTAGE = "percentage"
    RATIO = "ratio"
    GROWTH = "growth"
    TREND = "trend"


class AggregationPeriod(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class DashboardWidget(Base, TimestampMixin):
    """Custom dashboard widget configurations"""
    __tablename__ = "dashboard_widgets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    created_by_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    widget_type = Column(String(50), nullable=False)  # chart, metric, table, list
    
    # Chart configuration
    chart_type = Column(String(50), nullable=True)  # bar, line, pie, donut, area, scatter
    
    # Data source configuration
    data_source = Column(String(100), nullable=False)  # employees, attendance, leave, payroll, etc.
    metric_type = Column(Enum(MetricType), nullable=True)
    aggregation = Column(Enum(AggregationPeriod), nullable=True)
    
    # Query configuration
    filters = Column(JSONB, nullable=True)  # Filter conditions
    group_by = Column(ARRAY(String), nullable=True)  # Fields to group by
    order_by = Column(String(100), nullable=True)
    limit = Column(Integer, nullable=True)
    
    # Display settings
    color_scheme = Column(String(50), nullable=True)
    show_legend = Column(Boolean, default=True)
    show_labels = Column(Boolean, default=True)
    
    # Position in dashboard
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=4)  # Grid units
    height = Column(Integer, default=2)
    
    # Visibility
    is_public = Column(Boolean, default=False)  # Available to all users
    visible_to_roles = Column(ARRAY(String), nullable=True)
    
    is_active = Column(Boolean, default=True)


class Dashboard(Base, TimestampMixin):
    """Custom dashboard configurations"""
    __tablename__ = "dashboards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    created_by_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Layout configuration
    layout = Column(JSONB, nullable=True)  # Widget positions and sizes
    
    # Access control
    is_default = Column(Boolean, default=False)  # Default dashboard for role
    is_public = Column(Boolean, default=False)
    visible_to_roles = Column(ARRAY(String), nullable=True)
    
    is_active = Column(Boolean, default=True)


class DashboardWidgetMapping(Base):
    """Maps widgets to dashboards"""
    __tablename__ = "dashboard_widget_mappings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dashboard_id = Column(String(36), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False)
    widget_id = Column(String(36), ForeignKey("dashboard_widgets.id", ondelete="CASCADE"), nullable=False)
    
    # Position override for this dashboard
    position_x = Column(Integer, nullable=True)
    position_y = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)


# ==================== WORKFORCE ANALYTICS ====================

class HeadcountSnapshot(Base):
    """Daily snapshot of headcount for trend analysis"""
    __tablename__ = "headcount_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    
    # Counts
    total_employees = Column(Integer, default=0)
    active_employees = Column(Integer, default=0)
    on_probation = Column(Integer, default=0)
    on_notice = Column(Integer, default=0)
    
    # By employment type
    full_time = Column(Integer, default=0)
    part_time = Column(Integer, default=0)
    contract = Column(Integer, default=0)
    intern = Column(Integer, default=0)
    
    # By gender
    male = Column(Integer, default=0)
    female = Column(Integer, default=0)
    other_gender = Column(Integer, default=0)
    
    # Movement
    new_joiners = Column(Integer, default=0)  # Joined this day
    exits = Column(Integer, default=0)  # Left this day
    
    # Detailed breakdown (for department/designation level)
    department_breakdown = Column(JSONB, nullable=True)  # {dept_id: count}
    designation_breakdown = Column(JSONB, nullable=True)
    location_breakdown = Column(JSONB, nullable=True)
    age_breakdown = Column(JSONB, nullable=True)  # {range: count}
    tenure_breakdown = Column(JSONB, nullable=True)  # {range: count}
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AttritionAnalysis(Base, TimestampMixin):
    """Attrition metrics and analysis"""
    __tablename__ = "attrition_analysis"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    analysis_period = Column(String(20), nullable=False)  # 2024-01, Q1-2024, 2024
    period_type = Column(Enum(AggregationPeriod), nullable=False)
    
    # Attrition metrics
    attrition_rate = Column(Float, default=0)
    voluntary_exits = Column(Integer, default=0)
    involuntary_exits = Column(Integer, default=0)
    regretted_exits = Column(Integer, default=0)
    non_regretted_exits = Column(Integer, default=0)
    
    # Average tenure of leavers
    avg_tenure_months = Column(Float, nullable=True)
    
    # Breakdown by reason
    reason_breakdown = Column(JSONB, nullable=True)  # {reason: count}
    department_breakdown = Column(JSONB, nullable=True)
    tenure_breakdown = Column(JSONB, nullable=True)
    
    # Cost estimate
    estimated_cost = Column(Float, nullable=True)  # Cost of attrition


class EmployeeRiskScore(Base, TimestampMixin):
    """Predictive attrition risk scores for employees"""
    __tablename__ = "employee_risk_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    
    # Overall risk score (0-100)
    risk_score = Column(Float, default=0)
    risk_level = Column(String(20), nullable=True)  # low, medium, high, critical
    
    # Contributing factors
    factors = Column(JSONB, nullable=True)
    # Example: {
    #   "tenure_risk": 0.3,
    #   "engagement_risk": 0.5,
    #   "performance_risk": 0.2,
    #   "compensation_risk": 0.4,
    #   "manager_relationship": 0.3,
    #   "growth_opportunity": 0.6
    # }
    
    # Recommendations
    recommendations = Column(JSONB, nullable=True)
    
    # Validity
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    valid_until = Column(DateTime, nullable=True)


# ==================== PERFORMANCE ANALYTICS ====================

class PerformanceDistribution(Base, TimestampMixin):
    """Performance rating distribution for bell curve analysis"""
    __tablename__ = "performance_distributions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    cycle_id = Column(String(36), ForeignKey("appraisal_cycles.id"), nullable=False)
    
    # Distribution data
    rating_distribution = Column(JSONB, nullable=False)
    # Example: {"1": 5, "2": 15, "3": 50, "4": 25, "5": 5}
    
    # Bell curve fit
    mean_rating = Column(Float, nullable=True)
    std_deviation = Column(Float, nullable=True)
    
    # Expected vs Actual
    expected_distribution = Column(JSONB, nullable=True)  # Target percentages
    deviation_from_expected = Column(JSONB, nullable=True)
    
    # Breakdown
    department_distribution = Column(JSONB, nullable=True)
    designation_distribution = Column(JSONB, nullable=True)


class NineBoxAnalysis(Base, TimestampMixin):
    """9-Box matrix analysis data"""
    __tablename__ = "nine_box_analysis"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    cycle_id = Column(String(36), ForeignKey("appraisal_cycles.id"), nullable=False)
    
    # Box counts (1=low-low, 9=high-high)
    box_distribution = Column(JSONB, nullable=False)
    # Example: {"1": 5, "2": 10, "3": 15, ...}
    
    # Categories
    high_performers_high_potential = Column(Integer, default=0)  # Box 9 - Stars
    high_performers_moderate_potential = Column(Integer, default=0)  # Box 6
    high_performers_limited_potential = Column(Integer, default=0)  # Box 3
    moderate_performers_high_potential = Column(Integer, default=0)  # Box 8
    core_players = Column(Integer, default=0)  # Box 5 - Solid performers
    underperformers = Column(Integer, default=0)  # Boxes 1,2,4
    
    # Detailed employee mapping
    employee_mapping = Column(JSONB, nullable=True)
    # {employee_id: {box: 9, performance: 4.5, potential: 4.2}}


class EngagementScore(Base, TimestampMixin):
    """Aggregated engagement scores from surveys"""
    __tablename__ = "engagement_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    survey_id = Column(String(36), ForeignKey("surveys.id"), nullable=True)
    period = Column(String(20), nullable=False)  # 2024-01, Q1-2024
    
    # Overall scores
    overall_score = Column(Float, nullable=True)  # 0-100
    enps_score = Column(Float, nullable=True)  # -100 to 100
    response_rate = Column(Float, nullable=True)  # Percentage
    
    # Category scores
    category_scores = Column(JSONB, nullable=True)
    # Example: {
    #   "work_life_balance": 75,
    #   "growth_opportunities": 68,
    #   "manager_relationship": 82,
    #   "compensation": 65,
    #   "culture": 78
    # }
    
    # Breakdown
    department_scores = Column(JSONB, nullable=True)
    tenure_scores = Column(JSONB, nullable=True)
    
    # Trends
    change_from_previous = Column(Float, nullable=True)  # Percentage change


# ==================== ATTENDANCE ANALYTICS ====================

class AttendanceAnalytics(Base, TimestampMixin):
    """Aggregated attendance analytics"""
    __tablename__ = "attendance_analytics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    period = Column(String(20), nullable=False)  # 2024-01
    period_type = Column(Enum(AggregationPeriod), nullable=False)
    
    # Attendance metrics
    avg_attendance_rate = Column(Float, nullable=True)
    total_working_days = Column(Integer, default=0)
    total_present_days = Column(Integer, default=0)
    total_absent_days = Column(Integer, default=0)
    total_late_arrivals = Column(Integer, default=0)
    total_early_departures = Column(Integer, default=0)
    
    # Leave metrics
    total_leave_days = Column(Float, default=0)
    leave_type_breakdown = Column(JSONB, nullable=True)
    
    # Bradford Score aggregates
    avg_bradford_score = Column(Float, nullable=True)
    high_risk_employees = Column(Integer, default=0)  # Bradford > threshold
    
    # Department breakdown
    department_breakdown = Column(JSONB, nullable=True)


class BradfordScore(Base, TimestampMixin):
    """Bradford Factor scores for employees"""
    __tablename__ = "bradford_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    period = Column(String(20), nullable=False)  # 2024-01 or 2024
    
    # Bradford Factor = S x S x D
    # S = number of separate absence instances
    # D = total number of days absent
    absence_instances = Column(Integer, default=0)
    total_days_absent = Column(Integer, default=0)
    bradford_score = Column(Float, default=0)
    
    # Risk categorization
    risk_level = Column(String(20), nullable=True)  # low, medium, high, critical
    
    # Trend
    previous_score = Column(Float, nullable=True)
    score_change = Column(Float, nullable=True)


# ==================== PAYROLL ANALYTICS ====================

class PayrollAnalytics(Base, TimestampMixin):
    """Aggregated payroll analytics"""
    __tablename__ = "payroll_analytics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    period = Column(String(20), nullable=False)
    period_type = Column(Enum(AggregationPeriod), nullable=False)
    
    # Totals
    total_payroll_cost = Column(Float, default=0)
    total_gross = Column(Float, default=0)
    total_deductions = Column(Float, default=0)
    total_net = Column(Float, default=0)
    
    # Averages
    avg_salary = Column(Float, nullable=True)
    median_salary = Column(Float, nullable=True)
    
    # Components breakdown
    component_breakdown = Column(JSONB, nullable=True)
    # {component_name: total_amount}
    
    # Department breakdown
    department_breakdown = Column(JSONB, nullable=True)
    designation_breakdown = Column(JSONB, nullable=True)
    
    # Growth
    yoy_growth = Column(Float, nullable=True)
    mom_growth = Column(Float, nullable=True)


# ==================== RECRUITMENT ANALYTICS ====================

class RecruitmentAnalytics(Base, TimestampMixin):
    """Recruitment funnel and metrics"""
    __tablename__ = "recruitment_analytics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    period = Column(String(20), nullable=False)
    period_type = Column(Enum(AggregationPeriod), nullable=False)
    
    # Funnel metrics
    total_applications = Column(Integer, default=0)
    screened = Column(Integer, default=0)
    interviewed = Column(Integer, default=0)
    offered = Column(Integer, default=0)
    hired = Column(Integer, default=0)
    rejected = Column(Integer, default=0)
    withdrawn = Column(Integer, default=0)
    
    # Conversion rates
    screen_to_interview_rate = Column(Float, nullable=True)
    interview_to_offer_rate = Column(Float, nullable=True)
    offer_to_hire_rate = Column(Float, nullable=True)
    
    # Time metrics
    avg_time_to_hire_days = Column(Float, nullable=True)
    avg_time_to_fill_days = Column(Float, nullable=True)
    
    # Source effectiveness
    source_breakdown = Column(JSONB, nullable=True)
    # {source: {applications: X, hired: Y, conversion_rate: Z}}
    
    # Cost
    total_recruitment_cost = Column(Float, nullable=True)
    cost_per_hire = Column(Float, nullable=True)
    
    # Department breakdown
    department_breakdown = Column(JSONB, nullable=True)
