import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatIfCalculatorComponent } from './what-if-calculator.component';

describe('WhatIfCalculatorComponent', () => {
  let component: WhatIfCalculatorComponent;
  let fixture: ComponentFixture<WhatIfCalculatorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WhatIfCalculatorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WhatIfCalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
