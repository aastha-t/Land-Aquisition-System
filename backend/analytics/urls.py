from django.urls import path
from .views import DashboardStatsView, DecisionSupportAnalyticsView, DownloadPDFReportView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('decision-support/', DecisionSupportAnalyticsView.as_view(), name='decision-support-analytics'),
    path('reports/pdf/', DownloadPDFReportView.as_view(), name='download-pdf-report'),
]
