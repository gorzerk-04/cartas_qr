import pytest

from app.core.phone import InvalidPhoneError, normalize_phone


@pytest.mark.parametrize(
    "raw",
    ["987654321", "987 654 321", "+51 987654321", "+51987654321", "51987654321", "(987) 654-321", " 987.654.321 "],
)
def test_celular_peruano_se_normaliza(raw):
    assert normalize_phone(raw) == "+51987654321"


def test_internacional_con_mas_se_acepta_como_e164():
    assert normalize_phone("+1 415 555 2671") == "+14155552671"
    assert normalize_phone("+54 9 11 2345 6789") == "+5491123456789"


@pytest.mark.parametrize(
    "raw",
    ["", "   ", "12345", "887654321", "9876543210", "abc987654321", "+51 887654321", "+0123456789", "+123", "1415555267"],
)
def test_celulares_invalidos(raw):
    with pytest.raises(InvalidPhoneError):
        normalize_phone(raw)
