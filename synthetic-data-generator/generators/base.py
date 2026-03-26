from abc import ABC, abstractmethod
from typing import Any


class BaseGenerator(ABC):
    @abstractmethod
    def generate(self, n_rows: int, seed: int | None = None) -> list[Any]:
        pass
