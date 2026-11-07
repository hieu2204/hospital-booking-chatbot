from datetime import date, time

from app.models import Shift
from app.services.schedule import session_window, slot_times

MONDAY = date(2026, 11, 9)
SATURDAY = date(2026, 11, 14)
SUNDAY = date(2026, 11, 15)
NEW_YEAR = date(2027, 1, 1)


def test_br01_khung_gio_ngay_thuong():
    assert session_window(MONDAY, Shift.morning, set()) == (time(7, 0), time(12, 0))
    assert session_window(MONDAY, Shift.afternoon, set()) == (time(13, 0), time(16, 30))


def test_br02_thu_bay_chi_kham_buoi_sang():
    assert session_window(SATURDAY, Shift.morning, set()) == (time(7, 0), time(12, 0))
    assert session_window(SATURDAY, Shift.afternoon, set()) is None


def test_br03_chu_nhat_khong_kham():
    assert session_window(SUNDAY, Shift.morning, set()) is None


def test_br03_ngay_le_khong_kham():
    assert session_window(NEW_YEAR, Shift.morning, {NEW_YEAR}) is None


def test_br05_chia_slot_30_phut():
    morning = slot_times(time(7, 0), time(12, 0), 30)
    assert len(morning) == 10
    assert morning[0] == time(7, 0)
    assert morning[-1] == time(11, 30)

    afternoon = slot_times(time(13, 0), time(16, 30), 30)
    assert len(afternoon) == 7
    assert afternoon[-1] == time(16, 0)
