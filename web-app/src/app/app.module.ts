import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomePageComponent } from './containers/home-page/home-page.component';
import { WhatIfCalculatorComponent } from './components/what-if-calculator/what-if-calculator.component';

@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    WhatIfCalculatorComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
